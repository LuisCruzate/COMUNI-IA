(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  
  const pictograms = [
    {word:"Agua",emoji:"💧",category:"necesidades"},{word:"Comida",emoji:"🍎",category:"necesidades"},{word:"Baño",emoji:"🚻",category:"necesidades"},{word:"Ayuda",emoji:"🙋",category:"necesidades"},{word:"Descansar",emoji:"🛋️",category:"necesidades"},{word:"Dolor",emoji:"🤕",category:"necesidades"},
    {word:"Mamá",emoji:"👩",category:"personas"},{word:"Papá",emoji:"👨",category:"personas"},{word:"Amigo",emoji:"🧑‍🤝‍🧑",category:"personas"},{word:"Familia",emoji:"🏡",category:"personas"},
    {word:"Feliz",emoji:"😊",category:"emociones"},{word:"Triste",emoji:"😔",category:"emociones"},{word:"Enojado",emoji:"😠",category:"emociones"},{word:"Tranquilo",emoji:"😌",category:"emociones"},
    {word:"Jugar",emoji:"⚽",category:"actividades"},{word:"Música",emoji:"🎵",category:"actividades"},{word:"Leer",emoji:"📖",category:"actividades"},{word:"Salir",emoji:"🌳",category:"actividades"},{word:"Casa",emoji:"🏠",category:"actividades"},{word:"Sí",emoji:"👍",category:"actividades"},{word:"No",emoji:"👎",category:"actividades"}
  ];
  
  // Estado global en memoria (sincronizado con la BD)
  const state = {tokens:[],history:[],phrases:[],category:"todo",selections:0,accepted:0,spoken:0};

  // Inicialización asíncrona
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
    await DB.add('history', newItem); // Guardar en IndexedDB
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

    // Traducción en tiempo real (Simulada en el estado de voz)
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
    
    // Autocompletado / Predicción
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

  function speakMessage(){
    const message = Translator.buildSentence(state.tokens);
    if(!message){toast("Primero añade una palabra o una frase.");return;}
    
    if("speechSynthesis" in window){
        window.speechSynthesis.cancel();
        const utterance=new SpeechSynthesisUtterance(message);
        utterance.lang="es-CO";utterance.rate=.88;
        window.speechSynthesis.speak(utterance);
        $("#speechStatus").textContent=`Reproduciendo: “${message}”`;
    } else {
        $("#speechStatus").textContent=`Mensaje listo: “${message}”. Este navegador no ofrece voz automática.`;
    }
    state.spoken++;record("Mensaje hablado",message);renderMetrics();
  }

  // Event Listeners
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
        await DB.add('phrases', {text: phrase}); // Guardar en BD
    }
    input.value="";renderPhrases();toast("Frase guardada en este dispositivo.");
  });

  $("#clearHistoryButton").addEventListener("click",async ()=>{
    if(!state.history.length){toast("El historial ya está vacío.");return;}
    state.history=[];
    await DB.clear('history'); // Borrar de BD
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

  // Arrancar la app
  init();
})();