# COMUNI-AI — Frontend de la Fase 2

Prototipo académico de interfaz para comunicación aumentativa y alternativa (CAA). La propuesta está construida con HTML semántico, CSS y JavaScript sin dependencias externas.

## Cómo abrirlo
1. Descomprime la carpeta.
2. Abre `index.html` en un navegador moderno.
3. Para probar el modo PWA y el Service Worker, ejecuta la carpeta desde un servidor local (por ejemplo, la extensión Live Server de VS Code). Los Service Workers no funcionan al abrir `file://`.

## Funciones incluidas
- Tablero de pictogramas con categorías y búsqueda.
- Construcción de mensajes mediante pictogramas o texto.
- Síntesis de voz del navegador cuando está disponible.
- Conversación bilingüe con reconocimiento de voz, traducción en línea y lectura de la respuesta en el idioma seleccionado, con animación labial del avatar. Este módulo envía el texto a Google Translate y requiere internet; el resto de la app conserva su funcionamiento offline.
- Sugerencias de frases de ejemplo.
- Deshacer la última palabra.
- Frases guardadas durante la sesión.
- Historial y métricas demostrativas.
- Exportación CSV de acciones registradas.
- Modo de alto contraste y diseño adaptable a móvil/tablet.
- Manifest y Service Worker básico para caché sin conexión.

## Alcance y aspectos pendientes
Este proyecto es un prototipo frontend, no un sistema terminado de investigación. No incluye autenticación real, base de datos persistente, backend ni sincronización. Los datos de ejemplo se mantienen en memoria y se pierden al recargar la página. Antes de usarlo con participantes reales, el equipo debe revisar consentimiento, privacidad, accesibilidad con usuarios, licencias de pictogramas y protocolo de evaluación.

## Estructura
- `index.html`: estructura de la aplicación.
- `css/styles.css`: identidad visual y estilos responsive.
- `js/app.js`: interacciones del prototipo.
- `manifest.webmanifest`: configuración instalable.
- `sw.js`: caché básica para modo sin conexión.
