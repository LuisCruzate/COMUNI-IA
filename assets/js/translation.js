// Módulo independiente de reconocimiento, traducción y voz para la conversación bilingüe.
(() => {
  const languageSelect = document.getElementById("conversationLanguage");
  const microphoneButton = document.getElementById("conversationMicButton");
  const resultRegion = document.getElementById("conversationResult");
  const statusRegion = document.getElementById("conversationStatus");

  if (!languageSelect || !microphoneButton || !resultRegion || !statusRegion) {
    console.error("No se pudo inicializar el módulo de conversación: faltan elementos de la interfaz.");
    return;
  }

  console.warn("El módulo de conversación requiere internet para traducir. El texto se envía a Google Translate y el reconocimiento puede ser procesado por el navegador.");

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let silenceTimer = null;
  let recognizedText = "";
  let listening = false;
  let translating = false;

  function setListening(active) {
    listening = active;
    microphoneButton.setAttribute("aria-pressed", String(active));
    microphoneButton.innerHTML = active
      ? '<span aria-hidden="true">⏹</span> Detener escucha'
      : '<span aria-hidden="true">🎤</span> Escuchar a la otra persona';
  }

  async function traducirTexto(texto, idiomaOrigen, idiomaDestino) {
    const cleanText = String(texto || "").trim();
    if (!cleanText) throw new Error("No hay texto para traducir.");
    if (!navigator.onLine) throw new Error("No hay conexión a internet.");

    const params = new URLSearchParams({
      client: "gtx",
      sl: idiomaOrigen,
      tl: idiomaDestino,
      dt: "t",
      q: cleanText
    });
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);
    if (!response.ok) throw new Error(`El servicio de traducción respondió con HTTP ${response.status}.`);

    const data = await response.json();
    const segments = data?.[0];
    const translation = Array.isArray(segments)
      ? segments.map(segment => segment?.[0] || "").join("").trim()
      : "";
    if (!translation) throw new Error("El servicio no devolvió una traducción válida.");
    return translation;
  }

  function hablarTexto(texto, idioma) {
    if (typeof window.speakAvatar === "function") {
      window.speakAvatar(texto, idioma);
      return;
    }
    if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance !== "function") {
      throw new Error("Este navegador no ofrece síntesis de voz.");
    }
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = idioma;
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function translateIncoming(text) {
    if (!text || translating) return;
    translating = true;
    statusRegion.textContent = "Traduciendo al español…";
    try {
      const translation = await traducirTexto(text, languageSelect.value, "es");
      resultRegion.textContent = `La otra persona dijo: ${text}\nEn español: ${translation}`;
      statusRegion.textContent = "Traducción lista.";
      hablarTexto(translation, "es-ES");
    } catch (error) {
      console.error("No se pudo traducir el mensaje entrante.", error);
      statusRegion.textContent = !navigator.onLine
        ? "Sin conexión. El texto se escuchó, pero la traducción necesita internet."
        : "No se pudo traducir el mensaje. Revisa tu conexión e inténtalo de nuevo.";
    } finally {
      translating = false;
    }
  }

  function clearSilenceTimer() {
    if (silenceTimer !== null) {
      window.clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  }

  async function stopListening({ translate = false } = {}) {
    clearSilenceTimer();
    const textToTranslate = recognizedText.trim();
    const activeRecognition = recognition;
    setListening(false);
    recognition = null;

    if (activeRecognition) activeRecognition.stop();
    if (translate && textToTranslate) await translateIncoming(textToTranslate);
    else if (!textToTranslate) statusRegion.textContent = "No se detectó voz. Puedes intentarlo de nuevo.";
  }

  function startListening() {
    if (!navigator.onLine) {
      statusRegion.textContent = "Este módulo necesita conexión a internet para traducir.";
      return;
    }
    if (!Recognition) {
      statusRegion.textContent = "El reconocimiento de voz no está disponible en este navegador. Prueba Chrome o Edge.";
      return;
    }
    if (listening) return;

    clearSilenceTimer();
    recognizedText = "";
    resultRegion.textContent = "Te escucho…";
    recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = languageSelect.selectedOptions[0].dataset.locale;

    recognition.onresult = event => {
      recognizedText = Array.from(event.results)
        .map(result => result[0].transcript)
        .join(" ")
        .trim();
      resultRegion.textContent = recognizedText ? `Te escucho: ${recognizedText}` : "Te escucho…";
      statusRegion.textContent = "Escuchando. La traducción comenzará después de 2 segundos de silencio.";
      clearSilenceTimer();
      silenceTimer = window.setTimeout(() => {
        stopListening({ translate: true });
      }, 2000);
    };

    recognition.onerror = event => {
      clearSilenceTimer();
      setListening(false);
      recognition = null;
      statusRegion.textContent = event.error === "not-allowed"
        ? "No se concedió permiso para usar el micrófono."
        : `Error de reconocimiento de voz: ${event.error}.`;
    };

    recognition.onend = () => {
      if (listening) {
        clearSilenceTimer();
        setListening(false);
        recognition = null;
        if (recognizedText) void translateIncoming(recognizedText);
        else statusRegion.textContent = "La escucha terminó. Pulsa el micrófono para intentarlo de nuevo.";
      }
    };

    try {
      recognition.start();
      setListening(true);
      statusRegion.textContent = "Escuchando…";
    } catch (error) {
      recognition = null;
      setListening(false);
      console.error("No se pudo iniciar el reconocimiento de voz.", error);
      statusRegion.textContent = "No se pudo iniciar el micrófono. Comprueba los permisos del navegador.";
    }
  }

  window.ComuniTranslation = {
    traducirTexto,
    hablarTexto,
    startListening,
    stopListening,
    isListening: () => listening
  };
})();
