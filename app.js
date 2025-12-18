// ====== Helpers ======
const $ = (id) => document.getElementById(id);
const pad2 = (n) => String(n).padStart(2,"0");
const todayBR = () => {
  const d = new Date();
  return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
};
const clean = (s) => (s ?? "").toString().trim();

// ====== State ======
let tab = "receituario";
let rxMode = "adulto"; // adulto | pediatria | livre
let rxSelected = [];   // {id, name, hint, text}

// ====== Medication library ======
// Observação: isto é um atalho prático (não substitui julgamento clínico).
// Você pode editar/expandir a lista à vontade.
const MEDS = [
  // Dor / febre
  {
    id:"dipirona-500",
    tags:["dipirona","metamizol","dor","febre"],
    name:"Dipirona 500 mg (comprimido)",
    adulto:"Tomar 1 comprimido a cada 6/8 horas se dor/febre. Máx: 4g/dia.",
    pedi:"10–20 mg/kg/dose VO a cada 6–8h se necessário (máx conforme protocolos).",
    hint:"Analgésico/antitérmico"
  },
  {
    id:"paracetamol-500",
    tags:["paracetamol","acetaminofeno","dor","febre"],
    name:"Paracetamol 500 mg (comprimido)",
    adulto:"Tomar 1 comprimido a cada 6/8 horas se dor/febre (máx 3g/dia).",
    pedi:"10–15 mg/kg/dose VO a cada 4–6h (máx conforme protocolos).",
    hint:"Analgésico/antitérmico"
  },
  {
    id:"ibuprofeno-600",
    tags:["ibuprofeno","anti-inflamatorio","dor"],
    name:"Ibuprofeno 600 mg (comprimido)",
    adulto:"Tomar 1 comprimido a cada 8 horas após refeições por até 3 dias (se não houver contraindicação).",
    pedi:"5–10 mg/kg/dose VO a cada 6–8h (máx conforme protocolos).",
    hint:"AINE"
  },

  // Antibióticos comuns
  {
    id:"amoxi-500",
    tags:["amoxicilina","amoxi","antibiotico"],
    name:"Amoxicilina 500 mg (cápsula)",
    adulto:"Tomar 1 cápsula a cada 8 horas por 7 dias (conforme avaliação clínica).",
    pedi:"50 mg/kg/dia VO dividido em 3 tomadas (a cada 8h) por 7 dias (ajustar conforme caso).",
    hint:"Antibiótico (penicilina)"
  },
  {
    id:"amoxi-clav-875",
    tags:["amoxicilina","clavulanato","amoxi clav","antibiotico"],
    name:"Amoxicilina + Clavulanato 875/125 mg",
    adulto:"Tomar 1 comprimido a cada 12 horas por 7 dias (conforme avaliação clínica).",
    pedi:"Dose pediátrica depende da formulação. Ajustar mg/kg/dia conforme orientação clínica.",
    hint:"Antibiótico"
  },
  {
    id:"azitro-500",
    tags:["azitromicina","azitro","antibiotico"],
    name:"Azitromicina 500 mg (comprimido)",
    adulto:"Tomar 1 comprimido ao dia por 3 dias (conforme avaliação clínica).",
    pedi:"10 mg/kg no 1º dia, depois 5 mg/kg/dia do 2º ao 5º dia (orientação geral).",
    hint:"Macrolídeo"
  },

  // Odonto / adjuvantes
  {
    id:"clorex-012",
    tags:["clorexidina","enxaguante","bochecho"],
    name:"Clorexidina 0,12% (enxaguante)",
    adulto:"Bochechar 15 mL por 30s, 2x/dia por 7–10 dias.",
    pedi:"Uso em pediatria com cautela e orientação; evitar ingestão.",
    hint:"Antisséptico bucal"
  },
  {
    id:"nimesulida-100",
    tags:["nimesulida","anti-inflamatorio"],
    name:"Nimesulida 100 mg (comprimido)",
    adulto:"Tomar 1 comprimido a cada 12 horas após refeições por até 3 dias (se indicado e sem contraindicações).",
    pedi:"Geralmente evitar em pediatria (seguir protocolo/contraindicações).",
    hint:"AINE"
  }
];

// ====== DOM refs ======
const navBtns = [...document.querySelectorAll(".navbtn")];
const tabs = {
  receituario: $("tab-receituario"),
  orcamento: $("tab-orcamento"),
  atestado: $("tab-atestado"),
  ficha: $("tab-ficha"),
  config: $("tab-config"),
};
const pageTitle = $("pageTitle");
const pageSub = $("pageSub");
const printArea = $("printArea");

const sidebar = $("sidebar");
const menuBtn = $("menuBtn");

const segBtns = [...document.querySelectorAll(".segmented .seg")];

const rxSearch = $("rx_search");
const rxList = $("rx_list");
const rxSelectedEl = $("rx_selected");

// ====== Init defaults ======
function setDefaultDates(){
  ["rx_data","or_data","at_data","fc_data"].forEach(id => $(id).value = todayBR());
}
setDefaultDates();

// ====== Config storage ======
const CFG_KEY = "btx_cfg_v1";
function loadCfg(){
  try{
    const raw = localStorage.getItem(CFG_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch{ return null; }
}
function saveCfg(cfg){
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}
function applyCfgToInputs(cfg){
  $("cfg_nome").value = cfg?.nome ?? "";
  $("cfg_registro").value = cfg?.registro ?? "";
  $("cfg_tel").value = cfg?.tel ?? "";
  $("cfg_cidade").value = cfg?.cidade ?? "";
  $("cfg_end").value = cfg?.end ?? "";
}
function getCfgFromInputs(){
  return {
    nome: clean($("cfg_nome").value),
    registro: clean($("cfg_registro").value),
    tel: clean($("cfg_tel").value),
    cidade: clean($("cfg_cidade").value),
    end: clean($("cfg_end").value),
  };
}
const cfgLoaded = loadCfg();
if (cfgLoaded) applyCfgToInputs(cfgLoaded);

// ====== Navigation ======
function setTab(next){
  tab = next;
  navBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  Object.keys(tabs).forEach(k => tabs[k].classList.toggle("hidden", k !== tab));

  const meta = {
    receituario: ["Receituário", "Selecione medicamentos, ajuste posologia e imprima."],
    orcamento: ["Orçamento", "Texto livre (sem soma automática)."],
    atestado: ["Atestado", "Modelo profissional pronto para impressão."],
    ficha: ["Ficha Clínica", "Essencial e rápida. Sem banco de dados."],
    config: ["Configurações", "Dados do profissional para auto-preencher documentos."],
  }[tab];

  pageTitle.textContent = meta[0];
  pageSub.textContent = meta[1];

  // mobile
  sidebar.classList.remove("open");
}

navBtns.forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));
menuBtn.addEventListener("click", () => sidebar.classList.toggle("open"));

// ====== RX Mode ======
function setRxMode(mode){
  rxMode = mode;
  segBtns.forEach(b => b.classList.toggle("active", b.dataset.mode === rxMode));
  renderRxList();
  renderSelected();
}
segBtns.forEach(b => b.addEventListener("click", () => setRxMode(b.dataset.mode)));

// ====== RX List ======
function matches(m, q){
  if (!q) return true;
  const s = q.toLowerCase();
  return m.name.toLowerCase().includes(s) || (m.tags||[]).some(t => t.includes(s));
}
function buildPediText(m){
  const peso = parseFloat($("rx_peso").value || "0");
  // aqui a gente não calcula dose numérica pra tudo (pra não induzir erro),
  // mas dá o texto base + peso informado para orientar.
  let extra = "";
  if (peso > 0) extra = ` (Peso informado: ${peso} kg)`;
  return `${m.pedi}${extra}`;
}
function getMedText(m){
  if (rxMode === "adulto") return m.adulto;
  if (rxMode === "pediatria") return buildPediText(m);
  // livre: coloca só o nome, pra você escrever do jeito que quiser
  return "";
}
function renderRxList(){
  const q = clean(rxSearch.value);
  const meds = MEDS.filter(m => matches(m, q));

  rxList.innerHTML = "";
  meds.forEach(m => {
    const div = document.createElement("div");
    div.className = "med";
    div.innerHTML = `<div class="t">${m.name}</div><div class="d">${m.hint}</div>`;
    div.addEventListener("click", () => addMed(m));
    rxList.appendChild(div);
  });

  if (meds.length === 0){
    const empty = document.createElement("div");
    empty.className = "med";
    empty.innerHTML = `<div class="t">Nada encontrado</div><div class="d">Tente outro termo.</div>`;
    rxList.appendChild(empty);
  }
}
rxSearch.addEventListener("input", renderRxList);
renderRxList();

// ====== RX Selected ======
function addMed(m){
  const text = getMedText(m);
  rxSelected.push({
    id: m.id,
    name: m.name,
    hint: m.hint,
    text: text || "Descreva posologia aqui…"
  });
  renderSelected();
}
function addCustom(){
  const n = prompt("Nome do item/medicamento:", "Medicamento / Orientação");
  if (!n) return;
  rxSelected.push({ id:`custom-${Date.now()}`, name: n, hint:"Manual", text:"Descreva posologia aqui…" });
  renderSelected();
}
function removeItem(id){
  rxSelected = rxSelected.filter(x => x.id !== id);
  renderSelected();
}
function moveItem(id, dir){
  const i = rxSelected.findIndex(x => x.id === id);
  if (i < 0) return;
  const j = i + dir;
  if (j < 0 || j >= rxSelected.length) return;
  const tmp = rxSelected[i];
  rxSelected[i] = rxSelected[j];
  rxSelected[j] = tmp;
  renderSelected();
}
function updateItemText(id, text){
  const it = rxSelected.find(x => x.id === id);
  if (!it) return;
  it.text = text;
}
function renderSelected(){
  rxSelectedEl.innerHTML = "";

  if (rxSelected.length === 0){
    const div = document.createElement("div");
    div.className = "sel";
    div.innerHTML = `<div class="sel-title">Nenhum item selecionado</div>
      <div class="muted" style="margin-top:6px">Escolha um medicamento à esquerda ou adicione manualmente.</div>`;
    rxSelectedEl.appendChild(div);
    return;
  }

  rxSelected.forEach((it, idx) => {
    const box = document.createElement("div");
    box.className = "sel";
    box.innerHTML = `
      <div class="sel-top">
        <div>
          <div class="sel-title">${it.name}</div>
          <div class="muted">${it.hint}</div>
        </div>
        <div class="sel-tools">
          <button class="pill" data-act="up">↑</button>
          <button class="pill" data-act="down">↓</button>
          <button class="pill danger" data-act="del">Remover</button>
        </div>
      </div>
      <textarea rows="3">${it.text}</textarea>
    `;

    const [up, down, del] = box.querySelectorAll("button");
    up.addEventListener("click", ()=> moveItem(it.id, -1));
    down.addEventListener("click", ()=> moveItem(it.id, +1));
    del.addEventListener("click", ()=> removeItem(it.id));

    const ta = box.querySelector("textarea");
    ta.addEventListener("input", ()=> updateItemText(it.id, ta.value));

    rxSelectedEl.appendChild(box);
  });
}

// Buttons
$("btnAddCustom").addEventListener("click", addCustom);
$("btnClearRx").addEventListener("click", () => { rxSelected = []; renderSelected(); });

// ====== Config buttons ======
$("btnSaveCfg").addEventListener("click", () => {
  const cfg = getCfgFromInputs();
  saveCfg(cfg);
  alert("Configurações salvas no aparelho ✅");
});
$("btnResetCfg").addEventListener("click", () => {
  localStorage.removeItem(CFG_KEY);
  applyCfgToInputs(null);
  alert("Configurações restauradas.");
});

// ====== Preview/Print ======
function cfgForDoc(){
  const cfg = getCfgFromInputs();
  // se não tiver digitado agora, tenta carregar do storage
  const loaded = loadCfg();
  return {
    nome: cfg.nome || loaded?.nome || "",
    registro: cfg.registro || loaded?.registro || "",
    tel: cfg.tel || loaded?.tel || "",
    cidade: cfg.cidade || loaded?.cidade || "",
    end: cfg.end || loaded?.end || "",
  };
}

function docHeaderHTML(title, patientLine){
  const c = cfgForDoc();
  const right = [
    c.nome && `<div><b>${c.nome}</b></div>`,
    c.registro && `<div>${c.registro}</div>`,
    c.tel && `<div>${c.tel}</div>`,
    c.end && `<div>${c.end}</div>`,
    c.cidade && `<div>${c.cidade}</div>`,
  ].filter(Boolean).join("");

  return `
  <div class="doc-header">
    <div>
      <div class="doc-title">${title}</div>
      <div class="doc-sub">${patientLine}</div>
    </div>
    <div class="doc-prof">${right || "<div><b>Profissional</b></div><div>(configure em Configurações)</div>"}</div>
  </div>`;
}

function buildReceituarioDoc(){
  const paciente = clean($("rx_paciente").value) || "______________________________";
  const idade = clean($("rx_idade").value);
  const data = clean($("rx_data").value) || todayBR();

  const patientLine = `Paciente: <b>${paciente}</b>${idade ? ` • Idade: <b>${idade}</b>` : ""} • Data: <b>${data}</b>`;
  const items = rxSelected.length
    ? rxSelected.map(it => `<div class="rx-item"><span class="doc-label">• ${it.name}</span><br/>${escapeHtml(it.text)}</div>`).join("")
    : `<div class="rx-item">Nenhum item selecionado.</div>`;

  const obs = clean($("rx_obs").value);
  return `
  <div class="doc">
    <div class="doc-page">
      ${docHeaderHTML("Receituário", patientLine)}
      <div class="doc-body">
        <div class="doc-block">${items}</div>
        ${obs ? `<div class="doc-block"><span class="doc-label">Observações:</span><br/>${escapeHtml(obs)}</div>` : ""}
        <div class="sig">
          <div class="line">Assinatura e carimbo</div>
          <div class="line">Assinatura (opcional)</div>
        </div>
        <div class="doc-footer">Documento gerado pelo BTX Docs Saúde (offline).</div>
      </div>
    </div>
  </div>`;
}

function buildOrcamentoDoc(){
  const paciente = clean($("or_paciente").value) || "______________________________";
  const data = clean($("or_data").value) || todayBR();
  const texto = clean($("or_texto").value) || "______________________________________________________________";
  const patientLine = `Paciente: <b>${paciente}</b> • Data: <b>${data}</b>`;

  return `
  <div class="doc">
    <div class="doc-page">
      ${docHeaderHTML("Orçamento", patientLine)}
      <div class="doc-body">
        <div class="doc-block">${nl2br(escapeHtml(texto))}</div>
        <div class="sig">
          <div class="line">Assinatura do profissional</div>
          <div class="line">Assinatura do paciente/responsável</div>
        </div>
        <div class="doc-footer">Validade e condições conforme descritas no texto.</div>
      </div>
    </div>
  </div>`;
}

function buildAtestadoDoc(){
  const paciente = clean($("at_paciente").value) || "______________________________";
  const data = clean($("at_data").value) || todayBR();
  const tempo = clean($("at_tempo").value) || "_____ dias";
  const cid = clean($("at_cid").value);
  const texto = clean($("at_texto").value) ||
    `Declaro para os devidos fins que o(a) paciente acima identificado(a) esteve sob meus cuidados, necessitando de afastamento de suas atividades por ${tempo}.`;

  const patientLine = `Paciente: <b>${paciente}</b> • Data: <b>${data}</b>${cid ? ` • CID: <b>${cid}</b>` : ""}`;

  return `
  <div class="doc">
    <div class="doc-page">
      ${docHeaderHTML("Atestado", patientLine)}
      <div class="doc-body">
        <div class="doc-block">${nl2br(escapeHtml(texto))}</div>
        <div class="sig">
          <div class="line">Assinatura e carimbo</div>
          <div class="line">Assinatura (opcional)</div>
        </div>
        <div class="doc-footer">Documento gerado pelo BTX Docs Saúde (offline).</div>
      </div>
    </div>
  </div>`;
}

function buildFichaDoc(){
  const paciente = clean($("fc_paciente").value) || "______________________________";
  const data = clean($("fc_data").value) || todayBR();

  const qp = clean($("fc_qp").value);
  const hist = clean($("fc_hist").value);
  const exame = clean($("fc_exame").value);
  const conduta = clean($("fc_conduta").value);

  const patientLine = `Paciente: <b>${paciente}</b> • Data: <b>${data}</b>`;

  return `
  <div class="doc">
    <div class="doc-page">
      ${docHeaderHTML("Ficha Clínica", patientLine)}
      <div class="doc-body">
        <div class="doc-block"><span class="doc-label">Queixa principal:</span><br/>${qp ? nl2br(escapeHtml(qp)) : "—"}</div>
        <div class="doc-block"><span class="doc-label">História / Observações:</span><br/>${hist ? nl2br(escapeHtml(hist)) : "—"}</div>
        <div class="doc-block"><span class="doc-label">Exame:</span><br/>${exame ? nl2br(escapeHtml(exame)) : "—"}</div>
        <div class="doc-block"><span class="doc-label">Conduta:</span><br/>${conduta ? nl2br(escapeHtml(conduta)) : "—"}</div>

        <div class="sig">
          <div class="line">Assinatura e carimbo</div>
          <div class="line">Assinatura (opcional)</div>
        </div>
        <div class="doc-footer">Documento gerado pelo BTX Docs Saúde (offline).</div>
      </div>
    </div>
  </div>`;
}

// Utilities for safe HTML
function escapeHtml(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}
function nl2br(s){
  return s.replaceAll("\n","<br/>");
}

function buildDocByTab(){
  if (tab === "receituario") return buildReceituarioDoc();
  if (tab === "orcamento") return buildOrcamentoDoc();
  if (tab === "atestado") return buildAtestadoDoc();
  if (tab === "ficha") return buildFichaDoc();
  // config: nada para imprimir
  return `<div class="doc"><div class="doc-page">Nada para imprimir nesta aba.</div></div>`;
}

function preview(){
  printArea.innerHTML = buildDocByTab();
  alert("Pré-visualização pronta ✅ Agora clique em 'Imprimir / PDF'.");
}

function doPrint(){
  printArea.innerHTML = buildDocByTab();
  window.print();
}

$("btnPreview").addEventListener("click", preview);
$("btnPrint").addEventListener("click", doPrint);

// ====== Tab title + default texts ======
function initAtestadoText(){
  if (!clean($("at_texto").value)){
    $("at_texto").value = "Declaro para os devidos fins que o(a) paciente acima identificado(a) esteve sob meus cuidados, necessitando de afastamento de suas atividades pelo período descrito.";
  }
}
initAtestadoText();

// ====== Start ======
renderSelected();
setTab("receituario");
