// js/predictor.js - Motor de Predicción (N-gramas y Frecuencia)
const Predictor = {
  // Predice la siguiente palabra basándose en el historial
  predictNextWord(currentTokens, fullHistory) {
    if (!currentTokens.length || !fullHistory.length) return null;
    
    const lastWord = currentTokens[currentTokens.length - 1].word;
    let predictions = [];

    // Buscar en el historial qué palabras siguen a la última palabra usada
    fullHistory.forEach(entry => {
      const words = entry.detail.split(" ");
      const index = words.indexOf(lastWord);
      if (index !== -1 && index < words.length - 1) {
        predictions.push(words[index + 1]);
      }
    });

    // Retornar la más frecuente
    if (predictions.length) {
      const counts = predictions.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {});
      return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }
    return null;
  },

  // Sugiere frases basadas en la hora (Mañana, Tarde, Noche)
  suggestByTime(history) {
    const hour = new Date().getHours();
    let franja = hour < 12 ? "mañana" : hour < 19 ? "tarde" : "noche";
    
    // Filtrar historial de la misma franja horaria
    const timeHistory = history.filter(h => {
      const hHour = new Date(h.time).getHours();
      const hFranja = hHour < 12 ? "mañana" : hHour < 19 ? "tarde" : "noche";
      return hFranja === franja;
    });

    // En una versión completa, se contarían las frases más repetidas en esta franja.
    // Por ahora, retornamos las frases guardadas o sugerencias estáticas.
    return timeHistory.length > 0 ? timeHistory[0].detail : "Quiero agua";
  }
};