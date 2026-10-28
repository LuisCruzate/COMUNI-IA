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
  }
};