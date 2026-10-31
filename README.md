# COMUNI-AI — Frontend de la Fase 2

Prototipo académico de interfaz para comunicación aumentativa y alternativa (CAA). La propuesta está construida con HTML semántico, CSS y JavaScript sin dependencias externas.

## Cómo abrirlo
1. Descomprime la carpeta.
2. Abre `index.html` en un navegador moderno.
3. Para probar el modo PWA y el Service Worker, ejecuta la carpeta desde un servidor local (por ejemplo, la extensión Live Server de VS Code). Los Service Workers no funcionan al abrir `file://`.

## Funciones incluidas
- Tablero de pictogramas con categorías y búsqueda.
- Construcción de mensajes mediante pictogramas o texto.
- Síntesis de voz con el sistema nativo en Android Capacitor y con Web Speech API en navegador.
- Conversación bilingüe con reconocimiento de voz, traducción en línea y lectura de la respuesta en el idioma seleccionado, con animación labial del avatar. Las traducciones requieren internet; el endpoint público de Google usado en este prototipo no es una API contractual para producción.
- Sugerencias de frases de ejemplo.
- Deshacer la última palabra.
- Frases guardadas durante la sesión.
- Historial y métricas demostrativas.
- Exportación CSV de acciones registradas.
- Modo de alto contraste y diseño adaptable a móvil/tablet.
- Navegación móvil inferior, modo oscuro, ayuda inicial y avatar animado con respuesta táctil.
- Manifest y Service Worker básico para caché sin conexión.

## Alcance y aspectos pendientes
Este proyecto es un prototipo frontend, no un sistema terminado de investigación. No incluye autenticación real, base de datos persistente, backend ni sincronización. Los datos de ejemplo se mantienen en memoria y se pierden al recargar la página. Antes de usarlo con participantes reales, el equipo debe revisar consentimiento, privacidad, accesibilidad con usuarios, licencias de pictogramas y protocolo de evaluación.

## Estructura
- `index.html`: estructura de la aplicación.
- `assets/css/styles.css`: identidad visual y estilos responsive.
- `assets/js/app.js`: interacciones del prototipo.
- `assets/js/translation.js`: conversación bilingüe.
- APK Android: al ser una PWA, el método recomendado es una Trusted Web Activity (Bubblewrap/PWA Builder), que requiere publicar primero la app en HTTPS y configurar Digital Asset Links.
- `manifest.webmanifest`: configuración instalable.
- `sw.js`: caché básica para modo sin conexión.
