(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  
  const pictograms = [
    {word:"Agua",emoji:"💧",category:"necesidades"},{word:"Comida",emoji:"🍎",category:"necesidades"},{word:"Baño",emoji:"🚻",category:"necesidades"},{word:"Ayuda",emoji:"🙋",category:"necesidades"},{word:"Descansar",emoji:"🛋️",category:"necesidades"},{word:"Dolor",emoji:"🤕",category:"necesidades"},
    {word:"Mamá",emoji:"👩",category:"personas"},{word:"Papá",emoji:"👨",category:"personas"},{word:"Amigo",emoji:"🧑‍🤝‍🧑",category:"personas"},{word:"Familia",emoji:"🏡",category:"personas"},
    {word:"Feliz",emoji:"😊",category:"emociones"},{word:"Triste",emoji:"😔",category:"emociones"},{word:"Enojado",emoji:"😠",category:"emociones"},{word:"Tranquilo",emoji:"😌",category:"emociones"},
    {word:"Jugar",emoji:"⚽",category:"actividades"},{word:"Música",emoji:"🎵",category:"actividades"},{word:"Leer",emoji:"📖",category:"actividades"},{word:"Salir",emoji:"🌳",category:"actividades"},{word:"Casa",emoji:"🏠",category:"actividades"},{word:"Sí",emoji:"👍",category:"actividades"},{word:"No",emoji:"👎",category:"actividades"}
  ];
  
  const state = {tokens:[],history:[],phrases:[],category:"todo",selections:0,accepted:0,spoken:0};

  async function init() {
    const savedHistory = await DB.getAll('history');
    const savedPhrases = await DB.getAll('phrases');
    
    state.history = savedHistory.reverse();
    state.phrases = savedPhrases.map(p => p.text);
    
    if(state.phrases.length === 0) {
        state.phrases = ["Quiero ir a casa","Necesito un momento","Gracias por ayudarme"];
    }

    renderBoard();
    renderTokens();
    renderHistory();
    renderMetrics();
  }

  const toast = (message) => {
    const node=$("#toast"); node.textContent=message; node.classList.add("show");
    clearTimeout(toast.timer); toast.timer=setTimeout(()=>node.classList.remove("show"),2400);
  };

  const record = async (action, detail) => {
    const newItem = { action, detail, time: new Date().toISOString() };
    await DB.add('history', newItem);
    state.history.unshift(newItem);
    renderHistory(); 
    renderMetrics();
  };

  function renderBoard(){
    const query=$("#pictogramSearch").value.trim().toLocaleLowerCase("es");
    const visible=pictograms.filter(p=>(state.category==="todo"||p.category===state.category)&&p.word.toLocaleLowerCase("es").includes(query));
    const grid=$("#pictogramGrid"); grid.innerHTML="";
    if(!visible.length){grid.innerHTML='<p class="empty-state">No encontramos esa palabra. Prueba con otra búsqueda.</p>';return;}
    visible.forEach(p=>{
      const button=document.createElement("button"); button.type="button"; button.className="pictogram";
      button.setAttribute("aria-label",`Añadir ${p.word} al mensaje`);
      const visual=document.createElement("span");visual.className="pictogram-visual";visual.setAttribute("aria-hidden","true");visual.textContent=p.emoji;
      const label=document.createElement("strong");label.textContent=p.word;
      button.append(visual,label);button.addEventListener("click",()=>addToken(p.word,p.emoji));grid.append(button);
    });
  }

  function renderTokens(){
    const container=$("#messageTokens");container.innerHTML="";
    if(!state.tokens.length){const empty=document.createElement("span");empty.className="empty-message";empty.textContent="Tus palabras aparecerán aquí…";container.append(empty);}
    state.tokens.forEach((token,index)=>{
      const chip=document.createElement("span");chip.className="message-token";
      const text=document.createElement("span");text.textContent=(token.emoji?token.emoji+" ":"")+token.word;
      const remove=document.createElement("button");remove.type="button";remove.className="token-remove";remove.textContent="×";remove.setAttribute("aria-label",`Quitar ${token.word}`);
      remove.addEventListener("click",()=>{state.tokens.splice(index,1);renderTokens();record("Palabra retirada",token.word);});
      chip.append(text,remove);container.append(chip);
    });
    $("#undoButton").disabled=state.tokens.length===0;

    const currentSentence = Translator.buildSentence(state.tokens);
    if(currentSentence) {
        $("#speechStatus").textContent = `Mensaje actual: "${currentSentence}"`;
    } else {
        $("#speechStatus").textContent = "Puedes escuchar el mensaje antes de compartirlo.";
    }
  }

  async function addToken(word,emoji=""){
    const clean=String(word).trim();if(!clean)return;
    state.tokens.push({word:clean,emoji});state.selections++;
    renderTokens();
    await record("Palabra añadida",clean);
    
    const nextWord = Predictor.predictNextWord(state.tokens, state.history);
    if(nextWord) {
        toast(`Sugerencia: ¿Quieres decir "${nextWord}"?`);
    }
  }

  async function addPhrase(phrase){
    state.tokens=phrase.trim().split(/\s+/).map(word=>({word,emoji:""}));renderTokens();state.accepted++;
    await record("Sugerencia aceptada",phrase);renderMetrics();toast("La frase se añadió al mensaje.");
  }

  function renderPhrases(){
    const box=$("#savedPhrases");box.innerHTML="";
    if(!state.phrases.length){box.innerHTML='<p class="empty-state">Todavía no has guardado frases.</p>';return;}
    state.phrases.forEach((phrase,index)=>{
      const row=document.createElement("div");row.className="saved-phrase";
      const text=document.createElement("span");text.textContent=phrase;
      const use=document.createElement("button");use.type="button";use.textContent="Usar frase";use.addEventListener("click",()=>addPhrase(phrase));
      const remove=document.createElement("button");remove.type="button";remove.textContent="Eliminar";remove.setAttribute("aria-label",`Eliminar frase ${phrase}`);remove.addEventListener("click",async ()=>{state.phrases.splice(index,1);renderPhrases();toast("Frase eliminada.");});
      row.append(text,use,remove);box.append(row);
    });
  }

  function renderHistory(){
    const box=$("#historyList");box.innerHTML="";
    if(!state.history.length){box.innerHTML='<p class="empty-state">Aún no hay actividad. Prueba a seleccionar una palabra.</p>';return;}
    state.history.forEach(item=>{
      const row=document.createElement("div");row.className="history-entry";
      const icon=document.createElement("span");icon.className="history-icon";icon.textContent=item.action.includes("sugerencia")?"✦":"•";
      const details=document.createElement("div");const title=document.createElement("strong");title.textContent=item.action;const sub=document.createElement("small");sub.textContent=item.detail;details.append(title,sub);
      const time=document.createElement("time");time.dateTime=item.time;time.textContent=new Date(item.time).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"});
      row.append(icon,details,time);box.append(row);
    });
  }

  function renderMetrics(){
    $("#metricSelections").textContent=state.selections;$("#metricAccepted").textContent=state.accepted;$("#metricSpoken").textContent=state.spoken;
  }

  // --- FUNCIÓN PARA HABLAR EN EL COMUNICADOR PRINCIPAL (CON SELECTOR DE VOZ) ---
  function speakMessage(){
    const message = Translator.buildSentence(state.tokens);
    if(!message){toast("Primero añade una palabra o una frase.");return;}
    
    if("speechSynthesis" in window){
        window.speechSynthesis.cancel();
        const utterance=new SpeechSynthesisUtterance(message);
        
        const voiceSelect = document.getElementById('main-voice-select');
        if (voiceSelect && voiceSelect.value !== "") {
          const selectedVoice = window.speechSynthesis.getVoices()[voiceSelect.value];
          if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
          }
        } else {
          utterance.lang = "es-CO";
        }

        utterance.rate=.88;
        window.speechSynthesis.speak(utterance);
        $("#speechStatus").textContent=`Reproduciendo: “${message}”`;
    } else {
        $("#speechStatus").textContent=`Mensaje listo: “${message}”. Este navegador no ofrece voz automática.`;
    }
    state.spoken++;record("Mensaje hablado",message);renderMetrics();
  }

  // Event Listeners Generales
  $$(".nav-item[data-view]").forEach(button=>button.addEventListener("click",()=>{
    $$(".nav-item[data-view]").forEach(b=>b.classList.toggle("active",b===button));
    $$(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${button.dataset.view}`));
    if(button.dataset.view==="phrases")renderPhrases();if(button.dataset.view==="history")renderHistory();if(button.dataset.view==="admin")renderMetrics();
    const heading=$(`#view-${button.dataset.view} h1`);if(heading)heading.setAttribute("tabindex","-1"),heading.focus({preventScroll:true});
  }));
  
  $$(".category-tab").forEach(button=>button.addEventListener("click",()=>{state.category=button.dataset.category;$$(".category-tab").forEach(b=>b.classList.toggle("active",b===button));renderBoard();}));
  
  $("#pictogramSearch").addEventListener("input",renderBoard);
  $("#addWordButton").addEventListener("click",()=>{const input=$("#typedWord");addToken(input.value);input.value="";input.focus();});
  $("#typedWord").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();$("#addWordButton").click();}});
  $("#undoButton").addEventListener("click",()=>{const removed=state.tokens.pop();if(removed){renderTokens();record("Deshacer",removed.word);toast("Se quitó la última palabra.");}});
  $("#speakButton").addEventListener("click",speakMessage);
  $$(".suggestion").forEach(button=>button.addEventListener("click",()=>addPhrase(button.dataset.suggestion)));
  
  $("#phraseForm").addEventListener("submit",async event=>{
    event.preventDefault();const input=$("#newPhrase");const phrase=input.value.trim();if(!phrase)return;
    if(!state.phrases.includes(phrase)){
        state.phrases.unshift(phrase);
        await DB.add('phrases', {text: phrase});
    }
    input.value="";renderPhrases();toast("Frase guardada en este dispositivo.");
  });

  $("#clearHistoryButton").addEventListener("click",async ()=>{
    if(!state.history.length){toast("El historial ya está vacío.");return;}
    state.history=[];
    await DB.clear('history');
    renderHistory();toast("Historial borrado.");
  });

  $("#exportButton").addEventListener("click",()=>{
    const rows=[["accion","detalle","hora"],...state.history.map(h=>[h.action,h.detail,h.time])];
    const csv=rows.map(row=>row.map(cell=>`"${String(cell).replaceAll('"','""')}"`).join(",")).join("\r\n");
    const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="comuni-ai-metricas-demo.csv";a.click();URL.revokeObjectURL(url);toast("Resumen CSV exportado.");
  });

  $("#contrastToggle").addEventListener("click",event=>{const active=document.body.classList.toggle("high-contrast");event.currentTarget.setAttribute("aria-pressed",String(active));event.currentTarget.setAttribute("aria-label",active?"Desactivar alto contraste":"Activar alto contraste");toast(active?"Alto contraste activado.":"Alto contraste desactivado.");});
  $("#profileButton").addEventListener("click",()=>toast("Perfil de prueba P1. El inicio de sesión no está conectado en este prototipo."));
  
  window.addEventListener("online",()=>{$("#connectionText").textContent="Conexión disponible";});
  window.addEventListener("offline",()=>{$("#connectionText").textContent="Modo sin conexión";});

  document.addEventListener('comuni:frase-aceptada', (evento) => {
    const fraseAceptada = evento.detail.frase;
    addPhrase(fraseAceptada); 
  });

  // =========================================================
  // LÓGICA EXACTA DE LUIS CÁRDENAS (AVATAR Y TRADUCTOR)
  // =========================================================
  const $id = id => document.getElementById(id);
  const setA = (id, o) => { const e = $id(id); if(e) for (const k in o) e.setAttribute(k, o[k]); };
  
  function drawMouth(o, r, t = 0) {
    if(!$id('cav')) return;
    const cx = 200, cy = 140, W = 150 - Math.max(r, 0) * 55 + Math.max(-r, 0) * 8, g = o * 60,
      xl = cx - W, xr = cx + W, iu = cy - g * .45, il = cy + g * .6, top = cy - 70 - g * .3, bot = cy + 82 + g * .85;
    const R = y => `C${xr - W * .2} ${y} ${cx + W * .55} ${y} ${cx} ${y}C${cx - W * .55} ${y} ${xl + W * .2} ${y} ${xl} ${cy}`;
    const L = y => `C${xl + W * .2} ${y} ${cx - W * .55} ${y} ${cx} ${y}C${cx + W * .55} ${y} ${xr - W * .2} ${y} ${xr} ${cy}`;
    const cav = `M${xl} ${cy}${L(iu)}${R(il)}Z`;
    setA('cav', { d: cav }); setA('clipP', { d: cav });
    setA('up', { d: `M${xl} ${cy}C${xl + W * .1} ${cy - 55 - g * .2} ${cx - W * .5} ${top + 4} ${cx - W * .14} ${top}Q${cx} ${top + 16} ${cx + W * .14} ${top}C${cx + W * .5} ${top + 4} ${xr - W * .1} ${cy - 55 - g * .2} ${xr} ${cy}${R(iu)}Z` });
    setA('lo', { d: `M${xl} ${cy}C${xl + W * .1} ${cy + 50 + g * .5} ${cx - W * .5} ${bot} ${cx} ${bot}C${cx + W * .5} ${bot} ${xr - W * .1} ${cy + 50 + g * .5} ${xr} ${cy}${R(il)}Z` });
    const gap = il - iu;
    setA('tU', { x: cx - W * .6, y: iu - 4, width: W * 1.2, height: gap * .5 + 10 });
    setA('tL', { x: cx - W * .5, y: il - gap * .28 - 8, width: W, height: 16 });
    setA('tg', { cx, cy: il - 3 - t * gap * .45, rx: W * .35, ry: Math.max(0, gap * .28) });
    setA('g1', { cx: cx - W * .36, cy: top + 24, transform: `rotate(-12 ${cx - W * .36} ${top + 24})` });
    setA('g2', { cx: cx + W * .32, cy: top + 30 });
    setA('g3', { cx: cx - W * .3, cy: bot - 24 }); setA('g4', { cx: cx + W * .05, cy: bot - 19 }); setA('g5', { cx: cx + W * .42, cy: bot - 32 });
  }

  const Mouth = { o: 0, r: 0, t: 0, to: 0, tr: 0, tt: 0 };
  const VOW = { a: [1, 0, 0], e: [.5, -.6, 0], i: [.22, -1, 0], o: [.7, .85, 0], u: [.32, 1, 0], y: [.22, -1, 0] };
  const normChar = c => (c || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
  function viseme(ch) {
    const c = normChar(ch);
    if (!c) return [.04, 0, 0];
    if (VOW[c]) return VOW[c];
    if ('mbp'.includes(c)) return [0, 0, 0];
    if ('fv'.includes(c)) return [.14, -.2, 0];
    if ('szc'.includes(c)) return [.12, -.8, 0];
    if ('ltdn'.includes(c)) return [.32, -.2, 1];
    if ('wq'.includes(c)) return [.3, .85, 0];
    if (/[\s.,;:!?¿¡]/.test(c)) return [.04, 0, 0];
    return [.28, -.1, 0];
  }

  function shape(text, i) {
    const n = normChar(text[i]), v = viseme(text[i]), nx = normChar(text[i + 1]);
    if (/[a-z]/.test(n) && !VOW[n] && !'mbpfv'.includes(n) && VOW[nx]) { const w = VOW[nx]; return [Math.max(v[0], w[0] * .6), w[1] * .6, v[2]]; }
    return v;
  }

  let lastVis = '';
  function setVis(ch) { 
    if (/\p{L}/u.test(ch || '')) { 
      const v = ch.toUpperCase(); 
      if (v !== lastVis) { lastVis = v; if($id('vis')) $id('vis').textContent = v; } 
    } 
  }

  const sp = { on: false, paused: false, text: '', base: 0, t0: 0, rate: .9, idx: 0, vis: [] };
  let running = false;

  function loop(t) {
    if (sp.on && !sp.paused) {
      sp.idx = sp.base + (t - sp.t0) / 1000 * 11 * sp.rate;
      if (sp.idx >= sp.text.length) { sp.idx = sp.text.length - 1; finish(); }
      if (sp.on) { const k = Math.floor(sp.idx); [Mouth.to, Mouth.tr, Mouth.tt] = sp.vis[k] || [.04, 0, 0]; setVis(sp.text[k]); }
    } else { Mouth.to = 0; Mouth.tr = 0; Mouth.tt = 0; }
    Mouth.o += (Mouth.to - Mouth.o) * .3; Mouth.r += (Mouth.tr - Mouth.r) * .3; Mouth.t += (Mouth.tt - Mouth.t) * .3;
    drawMouth(Mouth.o, Mouth.r, Mouth.t);
    if (sp.on || Mouth.o > .01 || Math.abs(Mouth.r) > .01) requestAnimationFrame(loop);
    else { running = false; drawMouth(0, 0); }
  }
  const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
  function finish() { lastVis = ''; if($id('vis')) $id('vis').textContent = ''; sp.on = false; sp.paused = false; kick(); }
  
  function stopAvatar() { 
    if ('speechSynthesis' in window) speechSynthesis.cancel(); 
    finish(); 
  }

  function buildVis(t) {
    const out = [];
    for (let i = 0; i < t.length; i++) out[i] = shape(t, i);
    return out;
  }

  // --- FUNCIÓN PARA HABLAR EN EL AVATAR (CON SELECTOR DE VOZ) ---
  function speakAvatar(text) {
    text = (text || '').trim(); if (!text) return;
    stopAvatar();
    if($id('caption')) $id('caption').textContent = text;
    
    const isSlow = $id('slow') && $id('slow').getAttribute('aria-pressed') === 'true';
    const rate = isSlow ? 0.65 : 0.9;
    
    Object.assign(sp, { on: true, paused: false, text, base: 0, t0: performance.now(), rate, idx: 0, vis: buildVis(text) });
    
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      
      const voiceSelect = $id('voice-select');
      if (voiceSelect && voiceSelect.value !== "") {
        const selectedVoice = speechSynthesis.getVoices()[voiceSelect.value];
        if (selectedVoice) {
          u.voice = selectedVoice;
          u.lang = selectedVoice.lang;
        }
      } else {
        u.lang = "es-CO";
      }

      u.onend = u.onerror = () => finish();
      speechSynthesis.speak(u);
    }
    kick();
  }

  // Lógica del Traductor
  const LANGS_AV = { es: 'Español', en: 'Inglés', fr: 'Francés', pt: 'Portugués' };
  ['from', 'to'].forEach((id, n) => { 
    const sel = $id(id); if(!sel) return;
    sel.innerHTML = '';
    Object.entries(LANGS_AV).forEach(([k, name]) => sel.add(new Option(name, k, false, k === (n ? 'en' : 'es')))); 
  });

  const translateAvatar = async (text, from, to) => {
    if (from === to) return text;
    try {
      const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`);
      const j = await r.json();
      return j[0].map(x => x[0]).join('').trim();
    } catch { return "Error de conexión."; }
  };

  let lastTr = '';
  if($id('tGo')) {
    $id('tGo').onclick = async () => {
      const t = $id('tIn').value.trim(); if (!t) return; 
      $id('tOut').textContent = 'Traduciendo…';
      const r = await translateAvatar(t, $id('from').value, $id('to').value);
      lastTr = r || ''; $id('tOut').textContent = r || 'Error.';
    };
  }

  if($id('swap')) {
    $id('swap').onclick = () => { 
      const f = $id('from'), t = $id('to'); 
      [f.value, t.value] = [t.value, f.value]; 
    };
  }

  if($id('tFromBoard')) {
    $id('tFromBoard').onclick = () => { 
      const msg = state.tokens.map(t => t.word).join(" ");
      $id('tIn').value = msg; 
    };
  }

  if($id('tSpeak')) {
    $id('tSpeak').onclick = () => { if (lastTr) speakAvatar(lastTr); };
  }

  if($id('slow')) {
    $id('slow').onclick = (e) => {
      const active = e.currentTarget.getAttribute('aria-pressed') === 'true';
      e.currentTarget.setAttribute('aria-pressed', !active);
      e.currentTarget.textContent = !active ? '🐢 Modo lento: Activado' : '🐢 Modo lento para leer labios';
    };
  }

  // =========================================================
  // LÓGICA PARA LLENAR Y SINCRONIZAR LOS SELECTORES DE VOCES
  // =========================================================
  function populateVoices() {
    const selectors = [document.getElementById('voice-select'), document.getElementById('main-voice-select')];
    const voices = speechSynthesis.getVoices();
    
    selectors.forEach(voiceSelect => {
      if (!voiceSelect) return;
      
      const currentValue = voiceSelect.value;
      voiceSelect.innerHTML = '<option value="">Voz predeterminada del sistema</option>';
      
      const esVoices = voices.filter(v => v.lang.startsWith('es'));
      const otherVoices = voices.filter(v => !v.lang.startsWith('es'));
      
      const addOptions = (voiceArray, label) => {
        if (voiceArray.length === 0) return;
        const optgroup = document.createElement('optgroup');
        optgroup.label = label;
        voiceArray.forEach(voice => {
          const option = document.createElement('option');
          option.value = voices.indexOf(voice);
          option.textContent = `${voice.name} (${voice.lang})`;
          optgroup.appendChild(option);
        });
        voiceSelect.appendChild(optgroup);
      };

      addOptions(esVoices, "🇪🇸 Voces en Español");
      addOptions(otherVoices, "🌍 Otros idiomas");
      
      if (currentValue) voiceSelect.value = currentValue;
    });
  }

  function syncVoices(sourceSelect) {
    const value = sourceSelect.value;
    const otherSelect = sourceSelect.id === 'voice-select' ? document.getElementById('main-voice-select') : document.getElementById('voice-select');
    if (otherSelect) otherSelect.value = value;
  }

  if ('speechSynthesis' in window) {
    populateVoices();
    speechSynthesis.onvoiceschanged = populateVoices;
    
    setTimeout(() => {
      const vs1 = document.getElementById('voice-select');
      const vs2 = document.getElementById('main-voice-select');
      if (vs1) vs1.addEventListener('change', (e) => syncVoices(e.target));
      if (vs2) vs2.addEventListener('change', (e) => syncVoices(e.target));
    }, 500);
  }

  drawMouth(0, 0);
  
  // Arrancar la app
  init();
})();