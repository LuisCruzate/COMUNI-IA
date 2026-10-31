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
  const nativeSpeech = window.ComuniIsNativePlatform
    ? window.ComuniNativeSpeechRecognition
    : null;
  let recognition = null;
  let recognitionMode = null;
  let nativePartialListener = null;
  let nativeListeningListener = null;
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
    return Translator.translateText(texto, idiomaOrigen, idiomaDestino);
  }

  async function hablarTexto(texto, idioma) {
    if (typeof window.speakAvatar === "function") {
      await window.speakAvatar(texto, idioma);
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
      try {
        await hablarTexto(translation, "es-ES");
      } catch (error) {
        console.error("La traducción se completó, pero no se pudo reproducir la voz.", error);
        statusRegion.textContent = `Traducción lista, pero no se pudo reproducir: ${error.message || "comprueba el motor de texto a voz"}.`;
      }
    } catch (error) {
      console.error("No se pudo traducir el mensaje entrante.", error);
      resultRegion.textContent = `No se pudo traducir: ${error.message}`;
      statusRegion.textContent = !navigator.onLine
        ? "Sin conexión. El texto se escuchó, pero la traducción necesita internet."
        : "No se pudo traducir el mensaje. Revisa el texto y tu conexión e inténtalo de nuevo.";
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

  function scheduleSilenceStop() {
    clearSilenceTimer();
    silenceTimer = window.setTimeout(() => {
      void stopListening({ translate: true });
    }, 2000);
  }

  async function removeNativeListeners() {
    const listeners = [nativePartialListener, nativeListeningListener];
    nativePartialListener = null;
    nativeListeningListener = null;
    for (const listener of listeners) {
      if (!listener) continue;
      try {
        await listener.remove();
      } catch (error) {
        console.error("No se pudo retirar un listener del reconocimiento nativo.", error);
      }
    }
  }

  function updateNativeResult(matches) {
    const text = matches?.[0]?.trim();
    if (!text) return;
    recognizedText = text;
    resultRegion.textContent = `Te escucho: ${recognizedText}`;
    statusRegion.textContent = "Escuchando. La traducción comenzará después de 2 segundos de silencio.";
    scheduleSilenceStop();
  }

  async function stopListening({ translate = false } = {}) {
    clearSilenceTimer();
    const mode = recognitionMode;
    const activeRecognition = recognition;
    recognition = null;
    recognitionMode = null;

    let stopError = null;
    if (mode === "native" && nativeSpeech) {
      try {
        await nativeSpeech.stop();
      } catch (error) {
        stopError = error;
        console.error("No se pudo detener el reconocimiento nativo.", error);
      }
      await removeNativeListeners();
    } else if (activeRecognition) {
      activeRecognition.stop();
    }

    setListening(false);
    const textToTranslate = recognizedText.trim();
    if (translate && textToTranslate) await translateIncoming(textToTranslate);
    else if (!textToTranslate && stopError) {
      statusRegion.textContent = "No se pudo detener el micrófono. Inténtalo de nuevo.";
    } else if (!textToTranslate) {
      statusRegion.textContent = "No se detectó voz. Puedes intentarlo de nuevo.";
    }
  }

  async function startNativeListening() {
    if (!nativeSpeech) {
      statusRegion.textContent = "El reconocimiento nativo no está disponible. Sincroniza el proyecto Android y vuelve a compilar.";
      return;
    }

    try {
      const availability = await nativeSpeech.available();
      if (!availability.available) {
        statusRegion.textContent = "El dispositivo no tiene un servicio de reconocimiento de voz disponible.";
        return;
      }

      const permission = await nativeSpeech.requestPermissions();
      if (permission.speechRecognition !== "granted") {
        statusRegion.textContent = "Se necesita permiso de micrófono y reconocimiento de voz para escuchar.";
        return;
      }

      clearSilenceTimer();
      recognizedText = "";
      resultRegion.textContent = "Te escucho…";
      recognitionMode = "native";
      nativePartialListener = await nativeSpeech.addListener("partialResults", event => {
        updateNativeResult(event.matches);
      });
      nativeListeningListener = await nativeSpeech.addListener("listeningState", event => {
        if (event.status === "started") {
          statusRegion.textContent = "Escuchando…";
          return;
        }
        if (event.status === "stopped" && listening && recognitionMode === "native") {
          statusRegion.textContent = recognizedText
            ? "Procesando el resultado. La traducción comenzará después de 2 segundos."
            : "Procesando el audio…";
          scheduleSilenceStop();
        }
      });

      setListening(true);
      statusRegion.textContent = "Escuchando…";
      const locale = languageSelect.selectedOptions[0].dataset.locale;
      await nativeSpeech.start({
        language: locale,
        maxResults: 1,
        partialResults: true,
        popup: false
      });
    } catch (error) {
      clearSilenceTimer();
      recognitionMode = null;
      setListening(false);
      await removeNativeListeners();
      console.error("No se pudo iniciar el reconocimiento de voz nativo.", error);
      statusRegion.textContent = `No se pudo iniciar el micrófono: ${error.message || "comprueba los permisos del dispositivo"}.`;
    }
  }

  async function startListening() {
    if (!navigator.onLine) {
      statusRegion.textContent = "Este módulo necesita conexión a internet para traducir.";
      return;
    }
    if (window.ComuniIsNativePlatform) {
      if (listening) return;
      await startNativeListening();
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
    recognitionMode = "web";
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
      scheduleSilenceStop();
    };

    recognition.onerror = event => {
      clearSilenceTimer();
      setListening(false);
      recognition = null;
      recognitionMode = null;
      statusRegion.textContent = event.error === "not-allowed"
        ? "No se concedió permiso para usar el micrófono."
        : `Error de reconocimiento de voz: ${event.error}.`;
    };

    recognition.onend = () => {
      if (listening) {
        clearSilenceTimer();
        setListening(false);
        recognition = null;
        recognitionMode = null;
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
      recognitionMode = null;
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
