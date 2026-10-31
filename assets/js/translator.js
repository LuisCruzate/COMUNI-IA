// js/translator.js - Módulo de Traducción y Construcción de Oraciones
const Translator = {
  // Diccionario básico Español -> Inglés (para modo bilingüe)
  dictionary: {
    "Agua": "Water", "Comida": "Food", "Baño": "Bathroom", "Ayuda": "Help",
    "Descansar": "Rest", "Dolor": "Pain", "Mamá": "Mom", "Papá": "Dad",
    "Amigo": "Friend", "Familia": "Family", "Feliz": "Happy", "Triste": "Sad",
    "Enojado": "Angry", "Tranquilo": "Calm", "Jugar": "Play", "Música": "Music",
    "Leer": "Read", "Salir": "Go out", "Casa": "Home", "Sí": "Yes", "No": "No",
    "Quiero": "I want", "Necesito": "I need"
  },

  // Convierte una lista de tokens en una oración natural
  buildSentence(tokens) {
    if (!tokens || tokens.length === 0) return "";
    // Aquí se puede mejorar la gramática (ej. si empieza con "Quiero", añadir artículo)
    let sentence = tokens.map(t => t.word).join(" ");
    
    // Regla simple: Si es un sustantivo solo, agregarle "Quiero"
    if (tokens.length === 1 && ["Agua", "Comida", "Baño"].includes(tokens[0].word)) {
      sentence = "Quiero " + sentence.toLowerCase();
    }
    return sentence;
  },

  // Traduce una palabra o frase
  translate(text) {
    const words = text.split(" ");
    const translated = words.map(w => this.dictionary[w] || w);
    return translated.join(" ");
  },

  async translateText(text, languageFrom, languageTo) {
    const cleanText = String(text || "").trim();
    if (!cleanText) throw new Error("Escribe un texto para traducir.");
    if (languageFrom === languageTo) return cleanText;
    if (!navigator.onLine) throw new Error("No hay conexión a internet.");

    const params = new URLSearchParams({
      client: "gtx",
      sl: languageFrom,
      tl: languageTo,
      dt: "t",
      q: cleanText
    });
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);
    if (!response.ok) {
      throw new Error(`El servicio de traducción respondió con HTTP ${response.status}.`);
    }

    const data = await response.json();
    const segments = data?.[0];
    const translation = Array.isArray(segments)
      ? segments.map(segment => segment?.[0] || "").join("").trim()
      : "";
    if (!translation) throw new Error("El servicio no devolvió una traducción válida.");
    return translation;
  }
};