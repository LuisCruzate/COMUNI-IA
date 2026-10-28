/* ia_avatar.js · Asistente IA con avatar lip-sync · COMUNI-AI */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const avatar = $('ia-avatar');
  const vivo = $('ia-texto-vivo');
  if (!avatar || !vivo) return;

  const escena = avatar.closest('.ia-escena');
  const log = $('ia-log');
  const form = $('ia-form');
  const entrada = $('ia-entrada');
  const zonaSug = $('ia-sugerencias');
  const btnDetener = $('ia-detener');
  const btnRepetir = $('ia-repetir');
  const btnVoz = $('ia-silenciar');

  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let voz = null;
  let vozActiva = true;
  let ultimoTexto = vivo.textContent.trim();
  let actual = null;           // utterance en curso (evita bugs de GC y eventos de cancelaciones)
  let palabras = [];           // [{inicio, fin, el}]
  let hubeBoundary = false;
  let timerPalabras = null;
  let timerSim = null;

  /* ---------- Utilidades ---------- */
  const sinAcentos = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function velocidad() {
    try {
      const v = parseFloat(localStorage.getItem('comuni_velocidad_voz')); // ajusta la clave a tu configuración
      if (v >= 0.5 && v <= 1.5) return v;
    } catch (_) {}
    return 0.9;
  }

  function elegirVoz() {
    if (!synth) return;
    const lista = synth.getVoices();
    const prefs = ['es-CO', 'es-419', 'es-MX', 'es-US', 'es-ES'];
    voz = null;
    for (const p of prefs) {
      voz = lista.find((v) => v.lang.replace('_', '-') === p);
      if (voz) break;
    }
    if (!voz) voz = lista.find((v) => v.lang.toLowerCase().startsWith('es')) || null;
  }
  if (synth) {
    elegirVoz();
    synth.addEventListener('voiceschanged', elegirVoz);
  }

  /* ---------- Burbuja de texto en tiempo real ---------- */
  function pintarTexto(texto) {
    vivo.textContent = '';
    palabras = [];
    const re = /\S+/g;
    let m, ultimo = 0;
    while ((m = re.exec(texto))) {
      if (m.index > ultimo) vivo.append(texto.slice(ultimo, m.index));
      const span = document.createElement('span');
      span.className = 'ia-palabra';
      span.textContent = m[0];
      vivo.append(span);
      palabras.push({ inicio: m.index, fin: m.index + m[0].length, el: span });
      ultimo = re.lastIndex;
    }
  }

  function resaltar(i) {
    palabras.forEach((p, k) => {
      p.el.classList.toggle('ia-palabra--activa', k === i);
      p.el.classList.toggle('ia-palabra--dicha', k < i);
    });
    if (palabras[i]) {
      const letra = sinAcentos(palabras[i].el.textContent.toLowerCase()).match(/[aeiou]/);
      avatar.dataset.visema = letra ? letra[0] : 'a';
    }
  }

  /* ---------- Estado del avatar ---------- */
  function empezar(rate) {
    avatar.style.setProperty('--ia-ritmo', (0.3 / rate).toFixed(2) + 's');
    avatar.classList.add('hablando');
    escena && escena.classList.add('ia-hablando');
  }

  function terminar() {
    clearInterval(timerPalabras);
    clearTimeout(timerSim);
    avatar.classList.remove('hablando');
    escena && escena.classList.remove('ia-hablando');
    avatar.dataset.visema = 'a';
    palabras.forEach((p) => {
      p.el.classList.remove('ia-palabra--activa');
      p.el.classList.remove('ia-palabra--dicha');
    });
  }

  // Respaldo cuando el navegador no emite onboundary: avanza por temporizador
  function resaltadoPorTemporizador(rate) {
    let i = 0;
    const ms = 420 / rate;
    resaltar(0);
    timerPalabras = setInterval(() => {
      i++;
      if (i >= palabras.length || hubeBoundary) return clearInterval(timerPalabras);
      resaltar(i);
    }, ms);
  }

  /* ---------- Hablar ---------- */
  function detener() {
    actual = null;
    if (synth) synth.cancel();
    terminar();
  }

  function hablar(texto) {
    detener();
    ultimoTexto = texto;
    pintarTexto(texto);
    if (!vozActiva) return;                       // modo silencio: solo texto

    const rate = velocidad();

    if (!synth) {                                 // navegador sin voz: se anima la boca igualmente
      empezar(rate);
      resaltadoPorTemporizador(rate);
      timerSim = setTimeout(terminar, (palabras.length * 420) / rate + 300);
      return;
    }

    const u = new SpeechSynthesisUtterance(texto);
    u.lang = voz ? voz.lang : 'es-CO';
    if (voz) u.voice = voz;
    u.rate = rate;
    u.pitch = 1.05;
    hubeBoundary = false;

    u.onstart = () => {
      if (actual !== u) return;
      empezar(rate);
      setTimeout(() => {
        if (actual === u && !hubeBoundary) resaltadoPorTemporizador(rate);
      }, 700);
    };

    u.onboundary = (e) => {
      if (actual !== u || e.name === 'sentence') return;
      hubeBoundary = true;
      clearInterval(timerPalabras);
      const i = palabras.findIndex((p) => e.charIndex >= p.inicio && e.charIndex < p.fin);
      if (i >= 0) resaltar(i);
    };

    u.onend = () => { if (actual === u) { actual = null; terminar(); } };
    u.onerror = () => { if (actual === u) { actual = null; terminar(); } };

    actual = u;
    setTimeout(() => { if (actual === u) synth.speak(u); }, 60); // evita bug de Chrome tras cancel()
  }

  /* ---------- Chat ---------- */
  function agregar(rol, texto) {
    const li = document.createElement('li');
    li.className = 'ia-msg ia-msg--' + rol;
    li.textContent = texto;
    log.append(li);
    log.scrollTop = log.scrollHeight;
  }

  function decirComoIA(texto, { voz: hablarEnVoz = true } = {}) {
    agregar('ia', texto);
    if (hablarEnVoz) hablar(texto);
    else { detener(); ultimoTexto = texto; pintarTexto(texto); }
  }

  /* ---------- Sugerencias (offline, sin servidor) ---------- */
  const SUGERENCIAS = {
    'quiero ir': ['a casa', 'al baño', 'al médico', 'a la escuela'],
    'quiero': ['agua', 'comer', 'descansar', 'ir al baño'],
    'me duele': ['la cabeza', 'el estómago', 'la garganta', 'una pierna'],
    'tengo': ['hambre', 'sed', 'frío', 'calor', 'sueño'],
    'necesito': ['ayuda', 'agua', 'mi medicina', 'descansar'],
    'quiero ver': ['televisión', 'a mi familia', 'una película'],
  };

  function buscarSugerencia(texto) {
    const base = sinAcentos(texto.toLowerCase()).replace(/[.\s…]+$/g, '').trim();
    const claves = Object.keys(SUGERENCIAS).sort((a, b) => b.length - a.length);
    const clave = claves.find((k) => base.endsWith(sinAcentos(k)));
    if (!clave) return null;
    const inicio = texto.replace(/[.\s…]+$/g, '').trim();
    return { inicio, opciones: SUGERENCIAS[clave] };
  }

  function pintarChips(inicio, opciones) {
    zonaSug.textContent = '';
    opciones.forEach((op) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ia-btn ia-btn--chip';
      b.textContent = op;
      b.addEventListener('click', () => aceptar(`${inicio} ${op}`));
      zonaSug.append(b);
    });
  }

  function aceptar(frase) {
    const f = frase.charAt(0).toUpperCase() + frase.slice(1);
    agregar('usuario', f);
    zonaSug.textContent = '';
    // Tu app puede escuchar este evento y poner la frase en el área de mensaje
    document.dispatchEvent(new CustomEvent('comuni:frase-aceptada', { detail: { frase: f } }));
    decirComoIA(`Listo: "${f}".`);
  }

  function sugerir(texto, opciones = {}) {
    const r = buscarSugerencia(texto);
    if (!r) return false;
    const frase = `${r.inicio} ${r.opciones[0]}`;
    const f = frase.charAt(0).toUpperCase() + frase.slice(1);
    pintarChips(r.inicio, r.opciones);
    decirComoIA(`¿Quieres decir "${f}"?`, opciones);
    return true;
  }

  /* ---------- Eventos ---------- */
  form && form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = entrada.value.trim();
    if (!t) return;
    agregar('usuario', t);
    entrada.value = '';
    if (!sugerir(t)) {
      zonaSug.textContent = '';
      decirComoIA('Te escucho. Escribe "Quiero ir..." o "Tengo..." y te ayudo a completar la frase.');
    }
  });

  btnDetener && btnDetener.addEventListener('click', detener);
  btnRepetir && btnRepetir.addEventListener('click', () => hablar(ultimoTexto));

  btnVoz && btnVoz.addEventListener('click', () => {
    vozActiva = !vozActiva;
    btnVoz.setAttribute('aria-pressed', String(!vozActiva));
    btnVoz.innerHTML = vozActiva
      ? '<span aria-hidden="true">🔊</span> Voz activada'
      : '<span aria-hidden="true">🔇</span> Solo texto';
    if (!vozActiva) detener();
  });

  window.addEventListener('pagehide', detener);

  /* ---------- API pública para integrarlo con tu app ---------- */
  // Vincula tu área de mensaje: sugiere en silencio mientras el usuario escribe.
  function vincularMensaje(selector) {
    const campo = document.querySelector(selector);
    if (!campo) return;
    let t;
    campo.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const texto = campo.value !== undefined ? campo.value : campo.textContent;
        if (texto && texto.trim()) sugerir(texto, { voz: false });
      }, 700);
    });
  }

  window.ComuniAvatar = { hablar, detener, sugerir, vincularMensaje };
})();