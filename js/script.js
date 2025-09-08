"use strict";

/* ---------- Estado global ---------- */
let frota = [];
let logs = [];
let robotAtivo = false;
let intervalosMovimento = {};
let velocidadeHistorico = {};
let favoritados = new Set();
let currentFilters = {}; // Inicializado no init()
let currentSort = 'none';
let followVehicleId = null;
let notificacoes = [];

/* ---------- DOM ---------- */
const fleetGrid = document.getElementById('fleetGrid');
const statTotal = document.getElementById('statTotal');
const statActive = document.getElementById('statActive');
const statMoving = document.getElementById('statMoving');
const statLowFuel = document.getElementById('statLowFuel');
const btnRobot = document.getElementById('btnRobot');
const modeLabel = document.getElementById('modeLabel');
const searchInput = document.getElementById('searchInput');
const btnAdd = document.getElementById('btnAdd');
const filterToggle = document.getElementById('filterToggle');
const filterMenu = document.getElementById('filterMenu');
const btnOpenMap = document.getElementById('btnOpenMap');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalFooter = document.getElementById('modalFooter');
const modalClose = document.getElementById('modalClose');
const mapOverlay = document.getElementById('mapOverlay');
const mapCanvas = document.getElementById('mapCanvas');
const mapClose = document.getElementById('mapClose');
const btnExport = document.getElementById('btnExport');
const btnImport = document.getElementById('btnImport');
const btnStats = document.getElementById('btnStats');
const btnLog = document.getElementById('btnLog');
const btnManual = document.getElementById('btnManual');
const btnTheme = document.getElementById('btnTheme'); // Renomeado para consistência
const toastContainer = document.getElementById('toastContainer');
const alertsRow = document.getElementById('alertsRow');
const sortSelect = document.getElementById('sortSelect');
const btnFollow = document.getElementById('btnFollow');
const btnNotif = document.getElementById('btnNotif');
const notifMenu = document.getElementById('notifMenu');
const btnSettings = document.getElementById("btnSettings"); // Botão de configurações

/* ---------- Accessibility / Atalhos ---------- */
document.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.key === 'r' || e.key === 'R') toggleRobot();
  if (e.key === 'm' || e.key === 'M') abrirMapa(); // Alterado de 'f' para 'm' para mapa
  if (e.key === 'h' || e.key === 'H') abrirManual();
  if (e.key === 'l' || e.key === 'L') abrirLog();
  if (e.key === 's' || e.key === 'S') abrirEstatisticas();
  if (e.key === 'n' || e.key === 'N') abrirEditar(0);
});

/* ---------- Utilitários ---------- */
function toast(text, timeout = 4500) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = text;
  toastContainer.prepend(el);
  setTimeout(() => el.remove(), timeout);
}
function registrarLog(texto) {
  const hora = new Date().toISOString();
  logs.unshift({ hora, texto });
  if (logs.length > 5000) logs.length = 5000;
  salvarLocal();
  console.debug(`[LOG] ${hora} — ${texto}`);
}
function salvarLocal() {
  try {
    localStorage.setItem('saaS_frota', JSON.stringify(frota));
    localStorage.setItem('saaS_logs', JSON.stringify(logs.slice(0, 1000)));
    localStorage.setItem('saaS_robot', JSON.stringify(robotAtivo));
    localStorage.setItem('saaS_favs', JSON.stringify(Array.from(favoritados)));
  } catch (e) { console.warn('Falha salvar', e); }
}
function carregarLocal() {
  try {
    const s = localStorage.getItem('saaS_frota'); if (s) frota = JSON.parse(s);
    const l = localStorage.getItem('saaS_logs'); if (l) logs = JSON.parse(l);
    const r = localStorage.getItem('saaS_robot'); if (r) robotAtivo = JSON.parse(r);
    const f = localStorage.getItem('saaS_favs'); if (f) favoritados = new Set(JSON.parse(f));
  } catch (e) { console.warn('Falha carregar local', e); }
}

/* ---------- Carrega frota.json (se existir) ---------- */
async function carregarFrota() {
  try {
    const resp = await fetch('frota.json');
    if (!resp.ok) throw new Error('frota.json não encontrado');
    const dados = await resp.json();
    if (Array.isArray(dados) && dados.length) {
      frota = dados.map((v, i) => ({
        id: v.id || i + 1, nome: v.nome || v.name || `Veículo ${i + 1}`, categoria: v.categoria || 'terrestres',
        capacidade: v.capacidade || `${v.capacidadeNum || 1} pessoas`, capacidadeNum: v.capacidadeNum || 1,
        combustivel: v.combustivel || 'Gasolina', velocidadeMaxima: v.velocidadeMaxima || 160,
        emoji: v.emoji || '🚗', ativo: !!v.ativo, movendo: !!v.movendo, conectado: !!v.conectado,
        seguro: !!v.seguro, combustivelRestante: typeof v.combustivelRestante === 'number' ? v.combustivelRestante : 100,
        x: (v.x !== undefined) ? v.x : Math.round(5 + Math.random() * 90), y: (v.y !== undefined) ? v.y : Math.round(5 + Math.random() * 90),
        acoesEspeciais: v.acoesEpeciais || [], // Corrigido typo aqui (acoesEpeciais -> acoesEspeciais)
        motorista: v.motorista || '—'
      }));
      frota.forEach(v => velocidadeHistorico[v.id] = velocidadeHistorico[v.id] || []);
      registrarLog('frota.json carregado.');
      renderizarCards(); // Renderiza após carregar a frota
      return;
    }
    throw new Error('frota.json inválido');
  } catch (e) {
    console.warn('Não foi possível carregar frota.json — gerando exemplo.', e);
    // Não gerar frota exemplo aqui, pois o init() já faz isso se a frota estiver vazia
    renderizarCards();
  }
}

/* ---------- Filtro UI ---------- */
filterToggle.addEventListener('click', () => {
  const expanded = filterToggle.getAttribute('aria-expanded') === 'true';
  filterToggle.setAttribute('aria-expanded', String(!expanded));
  filterMenu.style.display = expanded ? 'none' : 'flex';
  filterMenu.setAttribute('aria-hidden', String(expanded));
});
document.getElementById('fActive').addEventListener('change', aplicarFiltros);
document.getElementById('fMoving').addEventListener('change', aplicarFiltros);
document.getElementById('fConnected').addEventListener('change', aplicarFiltros);
document.getElementById('fSecure').addEventListener('change', aplicarFiltros);
document.getElementById('fLowFuel').addEventListener('change', aplicarFiltros);
sortSelect.addEventListener('change', (e) => { currentSort = e.target.value; aplicarFiltros(); });

/* ---------- Busca ---------- */
searchInput.addEventListener('input', aplicarFiltros);

/* ---------- Renderização de cards (com filtros/ordenacao/favoritos) ---------- */
function renderizarCards() { // Não recebe lista, usa a global 'frota'
  fleetGrid.innerHTML = '';
  // aplicar filtros/ordenação
  let data = frota.slice(); // Usa a frota global
  data = aplicarFiltrosLocal(data);

  if (!data.length) fleetGrid.innerHTML = `<div style="padding:18px;color:${getComputedStyle(document.documentElement).getPropertyValue('--muted') || '#6b7280'}">Nenhum veículo encontrado.</div>`;

  // Favoritos primeiro
  data.sort((a, b) => {
    const fa = favoritados.has(a.id) ? 1 : 0, fb = favoritados.has(b.id) ? 1 : 0;
    return fb - fa;
  });

  data.forEach(veiculo => {
    const card = document.createElement('article'); card.className = 'card'; card.setAttribute('role', 'group');
    const ligarLabel = veiculo.ativo ? 'Desligar' : 'Ligar';
    const moverLabel = veiculo.movendo ? 'Parar' : 'Mover';
    const favStar = favoritados.has(veiculo.id) ? '★' : '☆';

    card.innerHTML = `
      <div class="card-head">
        <div class="title">
          <button class="fav-toggle" title="${favoritados.has(veiculo.id) ? 'Remover favorito' : 'Marcar favorito'}" onclick="toggleFavorito(${veiculo.id})">${favStar}</button>
          <span class="emoji" aria-hidden="true">${veiculo.emoji}</span>
          <span id="nome-${veiculo.id}">${veiculo.nome}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <small style="color:var(--muted)">${veiculo.categoria}</small>
          <button title="Abrir detalhes" class="btn" onclick="abrirDetalhe(${veiculo.id})">Detalhes</button>
        </div>
      </div>

      <div class="meta">
        <div><strong>Capacidade:</strong> ${veiculo.capacidade}</div>
        <div><strong>Combustível:</strong> ${veiculo.combustivel} (${Math.round(veiculo.combustivelRestante)}%)</div>
        <div><strong>Velocidade:</strong> <span id="vel-${veiculo.id}">${veiculo.movendo ? (veiculo._vel || 0) : 0}</span> km/h</div>
      </div>

      <div class="mini-map" id="mini-${veiculo.id}" aria-hidden="false">
        <div class="marker" id="marker-${veiculo.id}" style="left:${veiculo.x}%; top:${veiculo.y}%">${veiculo.emoji}</div>
      </div>

      <div class="card-actions">
        <div style="display:flex;gap:8px">
          <button class="btn primary" onclick="toggleAtivo(${veiculo.id})" id="btnAtivar-${veiculo.id}">${ligarLabel}</button>
          <button class="btn yellow" onclick="toggleMovimento(${veiculo.id})" id="btnMover-${veiculo.id}">${moverLabel}</button>
          <button class="btn" onclick="abrirAcoes(${veiculo.id})">Ações ▾</button>
        </div>
        <div style="display:flex;gap:8px">
          ${veiculo.acoesEspeciais && veiculo.acoesEspeciais.length ? `<button class="special-btn" onclick="abrirAcoesEspeciais(${veiculo.id})">⚡ Ações Especiais</button>` : ''}
          <button class="btn" onclick="abrirEditar(${veiculo.id})" title="Editar">✎</button>
          <button class="btn red" onclick="excluirVeiculo(${veiculo.id})" title="Excluir">🗑️</button>
        </div>
      </div>
    `;
    fleetGrid.appendChild(card);
    // atualizar marker e velocidade
    const marker = document.getElementById(`marker-${veiculo.id}`);
    if (marker) { marker.style.left = (veiculo.x || 50) + '%'; marker.style.top = (veiculo.y || 50) + '%'; }
    const velEl = document.getElementById(`vel-${veiculo.id}`);
    if (velEl) velEl.textContent = veiculo.movendo ? (veiculo._vel || 0) : 0;
  });

  atualizarEstatisticas();
}

/* ---------- Aplicar filtros (UI -> currentFilters) ---------- */
function aplicarFiltros() {
  // atualizar currentFilters
  currentFilters = {
    active: document.getElementById('fActive').checked,
    moving: document.getElementById('fMoving').checked,
    connected: document.getElementById('fConnected').checked,
    secure: document.getElementById('fSecure').checked,
    lowFuel: document.getElementById('fLowFuel').checked,
    q: (searchInput.value || '').trim().toLowerCase(),
    categoria: currentFilters.categoria || 'all' // Garante que a categoria esteja no filtro
  };
  renderizarCards();
}

/* ---------- Filtragem local (returns filtered & sorted array) ---------- */
function aplicarFiltrosLocal(arr) {
  let out = arr.slice();
  const f = currentFilters || {};

  // Filtros de checkbox e busca
  if (f.active) out = out.filter(v => v.ativo);
  if (f.moving) out = out.filter(v => v.movendo);
  if (f.connected) out = out.filter(v => v.conectado);
  if (f.secure) out = out.filter(v => v.seguro);
  if (f.lowFuel) out = out.filter(v => (v.combustivelRestante || 0) < 20);
  if (f.q) out = out.filter(v => (v.nome || '').toLowerCase().includes(f.q) || (v.categoria || '').toLowerCase().includes(f.q) || (v.combustivel || '').toLowerCase().includes(f.q));

  // NOVO: Filtro por categoria da sidebar
  if (f.categoria && f.categoria !== 'all') {
    out = out.filter(v => v.categoria === f.categoria);
  }

  // Ordenação
  if (currentSort === 'combAsc') out.sort((a, b) => (a.combustivelRestante || 0) - (b.combustivelRestante || 0));
  if (currentSort === 'combDesc') out.sort((a, b) => (b.combustivelRestante || 0) - (a.combustivelRestante || 0));
  if (currentSort === 'name') out.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  return out;
}

/* ---------- Estatísticas ---------- */
function atualizarEstatisticas() {
  statTotal.textContent = frota.length;
  statActive.textContent = frota.filter(v => v.ativo).length;
  statMoving.textContent = frota.filter(v => v.movendo).length;
  statLowFuel.textContent = frota.filter(v => v.combustivelRestante < 20).length;
}

/* ---------- Ativar / Desativar ---------- */
function toggleAtivo(id) {
  const v = frota.find(x => x.id === id); if (!v) return;
  v.ativo = !v.ativo;
  if (!v.ativo) { v.movendo = false; pararSimulacaoDeMovimento(id); }
  registrarLog(`${v.nome} ${v.ativo ? 'ativado' : 'desativado'}`);
  toast(`${v.nome} ${v.ativo ? 'ativado' : 'desativado'}`);
  salvarLocal(); renderizarCards();
}

/* ---------- Mover / Parar ---------- */
function toggleMovimento(id) {
  const v = frota.find(x => x.id === id); if (!v) return;
  if (!v.ativo && !robotAtivo) { toast('Ligue o veículo antes de mover (modo manual).'); return; }
  v.movendo = !v.movendo;
  if (v.movendo) iniciarSimulacaoDeMovimento(id); else pararSimulacaoDeMovimento(id);
  registrarLog(`${v.nome} ${v.movendo ? 'iniciou movimento' : 'parou'}`);
  salvarLocal(); renderizarCards();
}

/* ---------- Simulação de movimento ---------- */
function iniciarSimulacaoDeMovimento(id) {
  const v = frota.find(x => x.id === id);
  if (!v) return;
  if (intervalosMovimento[id]) return;

  v._vel = Math.round((v.velocidadeMaxima || 120) * (0.3 + Math.random() * 0.4));

  intervalosMovimento[id] = setInterval(() => {
    const pct = (Math.random() - 0.5) * 0.12;
    v._vel = Math.max(0, Math.round((v._vel || 0) * (1 + pct)));
    if (v._vel > v.velocidadeMaxima) v._vel = v.velocidadeMaxima;
    v.x = ((v.x || 50) + (Math.random() - 0.5) * 4 + 100) % 100;
    v.y = ((v.y || 50) + (Math.random() - 0.5) * 4 + 100) % 100;
    v.combustivelRestante = Math.max(0, Math.round((v.combustivelRestante || 100) - (v._vel / 1200)));
    velocidadeHistorico[v.id] = velocidadeHistorico[v.id] || [];
    velocidadeHistorico[v.id].push({ t: new Date().toISOString(), s: v._vel });
    if (velocidadeHistorico[v.id].length > 2000) velocidadeHistorico[v.id].shift();

    const marker = document.getElementById(`marker-${v.id}`);
    if (marker) { marker.style.left = (v.x) + '%'; marker.style.top = (v.y) + '%'; }
    const velEl = document.getElementById(`vel-${v.id}`);
    if (velEl) velEl.textContent = v._vel;
    const detVelEl = document.getElementById(`det-vel-${v.id}`);
    if (detVelEl) detVelEl.textContent = v._vel;
    const detMarker = document.getElementById(`det-marker-${v.id}`);
    if (detMarker) {
      detMarker.style.left = v.x + '%';
      detMarker.style.top = v.y + '%';
    }

    if (!robotAtivo) {
      if (v.combustivelRestante < 15) {
        adicionarNotificacao(`${v.nome} com combustível crítico (${v.combustivelRestante.toFixed(0)}%)`);
      }
      if (v.conectado === false) {
        adicionarNotificacao(`${v.nome} desconectado`);
      }
    }

    if (followVehicleId === v.id) {
      atualizarMapaPrincipal(true);
      // Não chamar atualizarEstatisticas aqui, pois é muito frequente
    }

    if (mapOverlay.style.display === 'flex') {
      atualizarMapaPrincipal();
    }
  }, 1200);
}

const pararSimulacaoDeMovimento = (id) => {
  if (intervalosMovimento[id]) {
    clearInterval(intervalosMovimento[id]);
    intervalosMovimento[id] = null;
  }
  const v = frota.find(x => x.id === id);
  if (v) {
    v._vel = 0;
    const velEl = document.getElementById(`vel-${v.id}`);
    if (velEl) velEl.textContent = '0';
  }
};

/* ---------- Ações especiais (mais descritivas) ---------- */
function abrirAcoesEspeciais(id) {
  const v = frota.find(x => x.id === id);
  if (!v || !v.acoesEspeciais || v.acoesEspeciais.length === 0) {
    toast("Nenhuma ação especial disponível para este veículo.");
    return;
  }

  let html = `<p><strong>Ações especiais disponíveis para ${v.nome}:</strong></p>`;
  v.acoesEspeciais.forEach((acao) => {
    const desc = gerarDescricaoAcao(acao);
    html += `
      <div style="margin:10px 0;padding:8px;border-radius:8px;background:#fffbe6;border:1px solid #fde68a;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700">${acao}</div>
          <div style="font-size:13px;color:var(--muted)">${desc}</div>
        </div>
        <div><button class="special-btn" onclick="executarAcaoEspecial(${v.id}, '${acao}')">⚡ Executar</button></div>
      </div>
    `;
  });

  mostrarModal(`${v.emoji} ${v.nome} — Ações Especiais`, html, `<button class="btn" onclick="fecharModal()">Fechar</button>`);
}

function executarAcaoEspecial(id, acao) {
  const v = frota.find(x => x.id === id);
  if (!v) return;

  registrarLog(`🚀 ${v.nome} executou a ação especial: ${acao}`);
  adicionarNotificacao(`${v.nome} executou "${acao}"`);
  toast(`${v.nome} executou ${acao}`);
  fecharModal(); // Fecha o modal após a execução

  // Lógica de exemplo para ações especiais
  if (acao === "Reboque") {
    v.velocidadeMaxima = Math.min(v.velocidadeMaxima, 60); // Reduz velocidade
    toast(`${v.nome} ativou modo reboque.`);
  } else if (acao === "Vigilância") {
    v.conectado = true;
    v.seguro = true;
    toast(`${v.nome} iniciou vigilância.`);
  } else if (acao === "Entrega") {
    v.movendo = true;
    iniciarSimulacaoDeMovimento(v.id);
    toast(`${v.nome} iniciou entrega.`);
  } else if (acao === "Carga pesada") {
    v.velocidadeMaxima = Math.min(v.velocidadeMaxima, 400); // Exemplo para aeronaves de carga
    toast(`${v.nome} está transportando carga pesada.`);
  } else if (acao === "Transporte Especial") {
    v.seguro = true;
    toast(`${v.nome} em transporte especial.`);
  } else if (acao === "Tiro") {
    toast(`${v.nome} efetuou um disparo!`);
  } else if (acao === "Combate") {
    toast(`${v.nome} entrou em modo de combate!`);
  } else if (acao === "Lançamento") {
    toast(`${v.nome} realizou um lançamento!`);
  } else if (acao === "Defesa") {
    toast(`${v.nome} ativou sistemas de defesa!`);
  } else if (acao === "Inspeção") {
    toast(`${v.nome} iniciou inspeção.`);
  }

  salvarLocal();
  renderizarCards();
}

function gerarDescricaoAcao(acao) {
  // heurística simples para descrição
  if (/reboque/i.test(acao)) return 'Ativa modo reboque: reduz velocidade e habilita reboque.';
  if (/vigilância|vigilancia/i.test(acao)) return 'Ativa vigilância: registra posição a cada 5s e aciona alerta ao detectar parada.';
  if (/entrega/i.test(acao)) return 'Modo entrega: diminui velocidade e prioriza rotas diretas.';
  if (/carga pesada/i.test(acao)) return 'Prepara o veículo para transporte de cargas muito pesadas.';
  if (/transporte especial/i.test(acao)) return 'Ativa protocolos de segurança para transporte de itens sensíveis.';
  if (/tiro/i.test(acao)) return 'Dispara o armamento principal do veículo.';
  if (/combate/i.test(acao)) return 'Ativa sistemas de combate e defesa.';
  if (/lançamento/i.test(acao)) return 'Realiza o lançamento de projéteis ou drones.';
  if (/defesa/i.test(acao)) return 'Ativa sistemas de defesa antiaérea ou antimíssil.';
  if (/inspeção/i.test(acao)) return 'Inicia rotina de inspeção de área.';
  if (/operação submersa/i.test(acao)) return 'Inicia operação de submersão e navegação submarina.';
  return 'Ação especial configurada para este veículo.';
}

/* ---------- Dropdown de ações (editar, mensagem, histórico) ---------- */
function abrirAcoes(id) {
  const v = frota.find(x => x.id === id); if (!v) return;
  const html = `<div style="display:flex;flex-direction:column;gap:8px">
    <button class="btn" onclick="abrirEditar(${id})">Editar</button>
    <button class="btn" onclick="abrirMensagem(${id})">Enviar Mensagem</button>
    <button class="btn" onclick="abrirHistoricoVelocidade(${id})">Histórico de velocidade</button>
    <button class="btn" onclick="toggleConectar(${id})">${v.conectado ? 'Desconectar' : 'Conectar'}</button>
    <button class="btn" onclick="toggleSeguro(${id})">${v.seguro ? 'Remover seguro' : 'Marcar seguro'}</button>
  </div>`;
  mostrarModal(`${v.nome} — Ações`, html, `<button class="btn" onclick="fecharModal()">Fechar</button>`);
}

/* ---------- Editar / Adicionar / Excluir (form maior e acessível) ---------- */
function abrirEditar(id) {
  const v = frota.find(x => x.id === id);
  const nome = v ? v.nome : '';
  const capNum = v ? v.capacidadeNum : '';
  const combustivel = v ? v.combustivel : 'Gasolina';
  const motorista = v ? v.motorista || '' : '';
  const categoria = v ? v.categoria : 'terrestres'; // Pega a categoria existente

  mostrarModal(v ? `Editar — ${v.nome}` : 'Adicionar Veículo', `
    <form id="formVeiculo" onsubmit="event.preventDefault(); salvarVeiculo(${id || 0})">
      <label>Nome:
        <input name="nome" value="${escapeHtml(nome)}" required>
      </label>

      <label>Tipo (categoria):
        <select name="categoria" aria-label="Categoria do veículo">
          <option value="terrestres" ${categoria === 'terrestres' ? 'selected' : ''}>Terrestres</option>
          <option value="aereos" ${categoria === 'aereos' ? 'selected' : ''}>Aéreos</option>
          <option value="ferroviarios" ${categoria === 'ferroviarios' ? 'selected' : ''}>Ferroviários</option>
          <option value="maritimos" ${categoria === 'maritimos' ? 'selected' : ''}>Marítimos</option>
          <option value="militares" ${categoria === 'militares' ? 'selected' : ''}>Militares</option>
        </select>
      </label>

      <label>Capacidade (número):
        <input name="cap" type="number" value="${capNum}">
      </label>

      <label>Combustível:
        <select name="comb">
          <option ${combustivel === 'Gasolina' ? 'selected' : ''}>Gasolina</option>
          <option ${combustivel === 'Diesel' ? 'selected' : ''}>Diesel</option>
          <option ${combustivel === 'Elétrico' ? 'selected' : ''}>Elétrico</option>
          <option ${combustivel === 'Querosene' ? 'selected' : ''}>Querosene</option>
          <option ${combustivel === 'Flex' ? 'selected' : ''}>Flex</option>
          <option ${combustivel === 'Fuel Oil' ? 'selected' : ''}>Fuel Oil</option>
          <option ${combustivel === 'Nuclear' ? 'selected' : ''}>Nuclear</option>
          <option ${combustivel === 'N/A' ? 'selected' : ''}>N/A</option>
        </select>
      </label>

      <label>Emoji/Ícone:
        <input name="emoji" value="${v ? v.emoji : '🚗'}">
      </label>

      <label>Motorista / responsável:
        <input name="motorista" value="${escapeHtml(motorista)}">
      </label>

      <label>Ações especiais (separe por vírgula):
        <input name="acoes" value="${v ? (v.acoesEspeciais || []).join(', ') : ''}">
      </label>

      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn primary" type="submit">Salvar</button>
        <button class="btn" type="button" onclick="fecharModal()">Cancelar</button>
      </div>
    </form>
  `, ``);
}

/* salvarVeiculo (criar/editar) */
function salvarVeiculo(id) {
  const form = document.querySelector('#formVeiculo'); if (!form) return;
  const data = new FormData(form);
  const nome = data.get('nome') || `Veículo ${Date.now()}`;
  const categoria = data.get('categoria') || 'terrestres';
  const capNum = Number(data.get('cap')) || 1;
  const combustivel = data.get('comb') || 'Gasolina';
  const emoji = data.get('emoji') || '🚗';
  const motorista = data.get('motorista') || '';
  const acoes = (data.get('acoes') || '').split(',').map(s => s.trim()).filter(Boolean);

  // Define velocidade máxima padrão baseada na categoria
  let velocidadeMaximaPadrao;
  switch (categoria) {
    case 'aereos': velocidadeMaximaPadrao = 800; break;
    case 'maritimos': velocidadeMaximaPadrao = 30; break;
    case 'ferroviarios': velocidadeMaximaPadrao = 200; break;
    case 'militares': velocidadeMaximaPadrao = 150; break; // Pode ser mais específico para militares
    default: velocidadeMaximaPadrao = 160; // Terrestres
  }

  const obj = {
    nome, categoria, capacidadeNum: capNum, capacidade: categoryCapacityText(categoria, capNum),
    combustivel, emoji, velocidadeMaxima: velocidadeMaximaPadrao,
    ativo: false, movendo: false, conectado: false, seguro: false, combustivelRestante: 100,
    x: Math.round(5 + Math.random() * 90), y: Math.round(5 + Math.random() * 90), acoesEspeciais: acoes, motorista
  };
  if (id && id > 0) {
    const idx = frota.findIndex(v => v.id === id); if (idx >= 0) { frota[idx] = { ...frota[idx], ...obj }; registrarLog(`Veículo ${obj.nome} (id ${id}) editado`); }
  } else {
    const novoId = frota.reduce((m, x) => Math.max(m, x.id), 0) + 1; obj.id = novoId; frota.push(obj); velocidadeHistorico[obj.id] = []; registrarLog(`Veículo ${obj.nome} (id ${novoId}) criado`);
  }
  fecharModal(); salvarLocal(); renderizarCards();
}

/* ---------- Excluir ---------- */
function excluirVeiculo(id) {
  if (!confirm('Confirma exclusão deste veículo?')) return;
  const idx = frota.findIndex(v => v.id === id); if (idx >= 0) { const nome = frota[idx].nome; pararSimulacaoDeMovimento(id); delete velocidadeHistorico[id]; frota.splice(idx, 1); registrarLog(`Veículo ${nome} excluído`); salvarLocal(); renderizarCards(); toast(`Veículo ${nome} excluído`); }
}

/* ---------- Mensagens ---------- */
function abrirMensagem(id) {
  const v = frota.find(x => x.id === id); if (!v) return;
  mostrarModal(`Mensagem — ${v.nome}`, `
    <label>Mensagem para ${v.nome}:<br/>
      <textarea id="mensagemTexto" rows="4" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e6edf3"></textarea>
    </label>
  `, `<button class="btn primary" onclick="enviarMensagem(${id})">Enviar</button><button class="btn" onclick="fecharModal()">Cancelar</button>`);
}
function enviarMensagem(id) { const txt = document.getElementById('mensagemTexto').value || ''; if (!txt.trim()) return alert('Digite uma mensagem.'); const v = frota.find(x => x.id === id); registrarLog(`Mensagem para ${v.nome}: "${txt.replace(/\n/g, ' ')}"`); fecharModal(); mostrarAlerta(`${v.nome} — Mensagem enviada (simulada)`); }

/* ---------- Histórico de velocidade ---------- */
function abrirHistoricoVelocidade(id) {
  const hist = velocidadeHistorico[id] || []; let html = `<h4>Últimos ${Math.min(hist.length, 200)} registros</h4><div style="max-height:50vh;overflow:auto"><table style="width:100%;border-collapse:collapse"><tr><th>Hora</th><th>Vel (km/h)</th></tr>`;
  hist.slice().reverse().slice(0, 200).forEach(r => { html += `<tr><td style="padding:6px;border-bottom:1px solid #eee">${r.t}</td><td style="padding:6px;border-bottom:1px solid #eee">${r.s}</td></tr>`; });
  html += `</table></div><div style="margin-top:8px"><button class="btn" onclick="exportarHistorico(${id})">Exportar CSV</button></div>`;
  mostrarModal('Histórico de velocidade', html, `<button class="btn" onclick="fecharModal()">Fechar</button>`);
}
function exportarHistorico(id) {
  const hist = velocidadeHistorico[id] || []; if (!hist.length) return alert('Sem histórico para exportar.');
  const csv = hist.map(h => `${h.t},${h.s}`).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `history_${id}.csv`; a.click(); fecharModal();
}

/* ---------- Conectar / Seguro ---------- */
function toggleConectar(id) { const v = frota.find(x => x.id === id); if (!v) return; v.conectado = !v.conectado; registrarLog(`${v.nome} ${v.conectado ? 'conectado' : 'desconectado'}`); salvarLocal(); renderizarCards(); fecharModal(); }
function toggleSeguro(id) { const v = frota.find(x => x.id === id); if (!v) return; v.seguro = !v.seguro; registrarLog(`${v.nome} ${v.seguro ? 'marcado como seguro' : 'removido seguro'}`); salvarLocal(); renderizarCards(); fecharModal(); }

/* ---------- Favoritos ---------- */
function toggleFavorito(id) {
  if (favoritados.has(id)) { favoritados.delete(id); toast('Removido dos favoritos'); } else { favoritados.add(id); toast('Adicionado aos favoritos'); }
  salvarLocal(); renderizarCards();
}

/* ---------- Modals ---------- */
function mostrarModal(titulo, bodyHtml, footerHtml) {
  modalTitle.textContent = titulo; modalBody.innerHTML = bodyHtml || ''; modalFooter.innerHTML = footerHtml || '';
  modalOverlay.setAttribute('aria-hidden', 'false'); modalOverlay.style.display = 'flex';
  // foco no primeiro botão
  setTimeout(() => { const btn = modalOverlay.querySelector('.btn.primary') || modalOverlay.querySelector('button, input'); if (btn) btn.focus(); }, 80);
}
function fecharModal() { modalOverlay.setAttribute('aria-hidden', 'true'); modalOverlay.style.display = 'none'; modalTitle.textContent = ''; modalBody.innerHTML = ''; modalFooter.innerHTML = ''; }

/* close handlers */
modalClose.addEventListener('click', fecharModal);
mapClose.addEventListener('click', () => { mapOverlay.style.display = 'none'; mapOverlay.setAttribute('aria-hidden', 'true'); });

/* ---------- Detalhe / Expand ---------- */
function abrirDetalhe(id) {
  const v = frota.find(x => x.id === id); if (!v) return;
  const html = `
    <div style="display:flex;gap:12px;flex-direction:column">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3>${v.emoji} ${v.nome}</h3>
        <div style="font-size:13px;color:var(--muted)">Vel: <span id="det-vel-${v.id}">${v._vel || 0}</span> km/h</div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:220px">
          <p><strong>Categoria:</strong> ${v.categoria}</p>
          <p><strong>Capacidade:</strong> ${v.capacidade}</p>
          <p><strong>Combustível:</strong> ${v.combustivel} (${Math.round(v.combustivelRestante)}%)</p>
          <p><strong>Velocidade máxima:</strong> ${v.velocidadeMaxima} km/h</p>
          <p><strong>Ações especiais:</strong> ${(v.acoesEspeciais || []).join(', ') || 'Nenhuma'}</p>
          <p><strong>Motorista:</strong> ${v.motorista || '—'}</p>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn primary" onclick="toggleAtivo(${v.id})">${v.ativo ? 'Desligar' : 'Ligar'}</button>
            <button class="btn yellow" onclick="toggleMovimento(${v.id})">${v.movendo ? 'Parar' : 'Mover'}</button>
            <button class="btn" onclick="abrirAcoes(${v.id})">Mais ações</button>
            ${v.acoesEspeciais && v.acoesEspeciais.length ? `<button class="btn primary" onclick="abrirAcoesEspeciais(${v.id})">⚡ Ações Especiais</button>` : ''}
          </div>
        </div>

        <div style="flex:1;min-width:280px">
          <div id="detailMap-${v.id}" class="detail-map" style="height:260px;border-radius:8px;background:repeating-linear-gradient(0deg,#eef2f6,#eef2f6 28px,transparent 29px),repeating-linear-gradient(90deg,#eef2f6,#eef2f6 28px,transparent 29px);position:relative">
            <div id="det-marker-${v.id}" style="position:absolute;left:${v.x}%;top:${v.y}%;transform:translate(-50%,-50%);font-size:22px">${v.emoji}</div>
          </div>
          <div style="margin-top:10px">
            <button class="btn" onclick="followOnMap(${v.id})">Seguir no mapa</button>
          </div>
        </div>
      </div>
    </div>
  `;
  mostrarModal(`${v.emoji} ${v.nome} — Detalhes`, html, `<button class="btn" onclick="fecharModal()">Fechar</button>`);
}

/* followOnMap */
function followOnMap(id) {
  followVehicleId = id;
  abrirMapa();
  toast('Seguindo veículo no mapa');
}

/* ---------- Map (simples, sem API) ---------- */
function atualizarMapaPrincipal(onlyIfOpen) {
  if (onlyIfOpen && mapOverlay.style.display !== 'flex') return;
  mapCanvas.innerHTML = '';
  // create grid background (just markers)
  frota.forEach(v => {
    const el = document.createElement('div'); el.className = 'map-marker'; el.innerHTML = `${v.emoji}<div style="font-size:11px">${v.nome}</div>`;
    el.style.position = 'absolute'; el.style.left = (v.x || 50) + '%'; el.style.top = (v.y || 50) + '%'; el.style.transform = 'translate(-50%,-50%)';
    el.style.padding = '6px 8px'; el.style.borderRadius = '8px'; el.style.background = 'rgba(255,255,255,0.9)'; el.style.boxShadow = '0 6px 18px rgba(2,6,23,0.12)';
    el.style.cursor = 'pointer'; el.onclick = () => { abrirDetalhe(v.id); };
    mapCanvas.appendChild(el);
  });
  // highlight follow
  if (followVehicleId) {
    const v = frota.find(x => x.id === followVehicleId);
    if (v) {
      // center-ish effect: show big marker
      const big = document.createElement('div'); big.style.position = 'absolute'; big.style.left = (v.x || 50) + '%'; big.style.top = (v.y || 50) + '%';
      big.style.transform = 'translate(-50%,-50%)'; big.style.padding = '16px'; big.style.borderRadius = '12px'; big.style.background = 'rgba(37,99,235,0.12)';
      big.style.border = `2px solid var(--accent)`; big.innerHTML = `<div style="font-size:26px">${v.emoji}</div><div style="font-size:13px;color:var(--muted)">${v.nome}</div>`;
      mapCanvas.appendChild(big);
    }
  }
}

/* ---------- Alerts / toaster / pequenas notificações ---------- */
function gerarAlerta(texto, id = null) {
  // mostra alerta visual e toast; também adiciona a alertsRow
  const a = document.createElement('div'); a.className = 'alert'; a.style.padding = '8px 12px'; a.style.borderRadius = '8px'; a.style.background = '#fff7ed'; a.style.border = '1px solid #fde68a';
  a.textContent = texto;
  a.onclick = () => { if (id) abrirDetalhe(id); };
  alertsRow.appendChild(a);
  setTimeout(() => a.remove(), 8000);
  toast(texto, 5000);
}

/* ---------- Robot (auto) ---------- */
function toggleRobot() {
  robotAtivo = !robotAtivo;
  btnRobot.setAttribute('aria-pressed', robotAtivo);
  modeLabel.textContent = robotAtivo ? 'Robô' : 'Manual';
  registrarLog(`Modo ${robotAtivo ? 'Robô' : 'Manual'} ativado`);
  toast(`Modo ${robotAtivo ? 'Robô' : 'Manual'} ativado`);

  if (robotAtivo) {
    frota.forEach(v => {
      if (!v.ativo) v.ativo = true;
      if (!v.movendo) {
        v.movendo = true;
        iniciarSimulacaoDeMovimento(v.id);
      }

      // Notificar veículos com ações especiais
      if (v.acoesEspeciais && v.acoesEspeciais.length) {
        adicionarNotificacao(`${v.nome} possui ações especiais disponíveis (${v.acoesEspeciais.join(", ")})`);
        registrarLog(`${v.nome} com ações especiais detectadas pelo robô.`);

        // Opcional: o robô já executa automaticamente a primeira ação especial
        // if (v.acoesEspeciais.length > 0) {
        //   executarAcaoEspecial(v.id, v.acoesEspeciais[0]);
        // }
      }
    });
    btnRobot.textContent = "🟢🤖";
  } else {
    frota.forEach(v => {
      v.movendo = false;
      pararSimulacaoDeMovimento(v.id);
      v.ativo = false;
    });
    btnRobot.textContent = "🤖";
  }
  salvarLocal();
  renderizarCards();
}

/* ---------- Utilitários extras ---------- */
function categoryCapacityText(categoria, num) {
  if (categoria === 'maritimos') return `${num} toneladas`;
  if (categoria === 'aereos' && num > 20) return `${num} assentos`;
  if (categoria === 'ferroviarios') return `${num} passageiros`;
  if (categoria === 'militares' && num === 0) return `equipamento`;
  if (categoria === 'militares') return `${num} ocupantes`;
  return `${num} pessoas`;
}
function escapeHtml(s) { return (s + '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function mostrarAlerta(text) { mostrarModal('Alerta', `<div style="padding:12px">${escapeHtml(text)}</div>`, `<button class="btn" onclick="fecharModal()">Fechar</button>`); }

/* ---------- Abrir/Fechar mapa ---------- */
function abrirMapa() {
  mapOverlay.style.display = 'flex';
  mapOverlay.setAttribute('aria-hidden', 'false');
  atualizarMapaPrincipal();
}

/* ---------- Seguir veículo ---------- */
btnFollow.addEventListener('click', () => {
  const ativo = followVehicleId ? null : prompt('ID do veículo para seguir:');
  followVehicleId = ativo ? Number(ativo) : null;
  toast(followVehicleId ? `Seguindo veículo ${followVehicleId}` : 'Parou de seguir veículo');
  atualizarMapaPrincipal(true);
});

/* ---------- Inicialização ---------- */
async function init() {
  carregarLocal();
  // Inicializa currentFilters com um valor padrão para categoria
  currentFilters = {
    active: false, moving: false, connected: false, secure: false, lowFuel: false, q: '', categoria: 'all'
  };

  await carregarFrota();

  // Se a frota ainda estiver vazia após tentar carregar frota.json, gera a frota de exemplo
  if (frota.length === 0) {
    console.warn('Frota vazia, gerando frota de exemplo.');
    gerarFrotaExemplo(); // Função que gera a frota de exemplo (precisa ser definida)
    renderizarCards();
  }

  // ensure UI states
  document.getElementById('filterMenu').style.display = 'none';

  // theme
  const isDarkTheme = localStorage.getItem("saaS_tema") === "escuro";
  if (isDarkTheme) {
    document.body.classList.add('dark');
    btnTheme.textContent = "☀️";
  } else {
    document.body.classList.remove('dark');
    btnTheme.textContent = "🌙";
  }

  // attach header buttons minimal behavior
  if (btnOpenMap) btnOpenMap.addEventListener('click', abrirMapa);
  if (btnAdd) btnAdd.addEventListener('click', () => abrirEditar(0));
  if (btnExport) btnExport.addEventListener('click', () => exportarFrota());
  if (btnImport) btnImport.addEventListener('click', () => importarFrota());
  if (btnStats) btnStats.addEventListener('click', () => abrirEstatisticas());
  if (btnLog) btnLog.addEventListener('click', () => abrirLog());
  if (btnManual) btnManual.addEventListener('click', () => abrirManual());
  if (btnRobot) btnRobot.addEventListener('click', toggleRobot);
  if (btnSettings) btnSettings.addEventListener("click", abrirConfiguracoes);
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const isDark = document.body.classList.contains('dark');
      btnTheme.textContent = isDark ? "☀️" : "🌙";
      localStorage.setItem("saaS_tema", isDark ? "escuro" : "claro"); // Salva a preferência
      registrarLog(`Tema alterado para ${isDark ? 'noturno' : 'diurno'}`);
    });
  }

  // initial render
  aplicarFiltros();
  renderizarNotificacoes(); // Renderiza notificações ao iniciar
}

/* ---------- Export / Import (simples) ---------- */
function exportarFrota() {
  const blob = new Blob([JSON.stringify(frota, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'frota_export.json'; a.click();
  toast('Frota exportada (JSON).');
}
function importarFrota() {
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json';
  input.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const fr = new FileReader(); fr.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) {
          frota = data;
          frota.forEach(v => velocidadeHistorico[v.id] = velocidadeHistorico[v.id] || []);
          salvarLocal();
          renderizarCards();
          toast('Frota importada.');
        } else {
          alert('Arquivo JSON inválido: esperado um array de veículos.');
        }
      } catch (err) {
        alert('Erro ao ler ou parsear o arquivo JSON: ' + err.message);
      }
    }; fr.readAsText(f);
  };
  input.click();
}

/* ---------- Estatísticas / Log / Manual (simples) ---------- */
function abrirEstatisticas() {
  const total = frota.length;
  const ativos = frota.filter(v => v.ativo).length;
  const movendo = frota.filter(v => v.movendo).length;
  const baixoComb = frota.filter(v => v.combustivelRestante < 20).length;

  const categorias = ["terrestres", "aereos", "ferroviarios", "maritimos", "militares"];
  let catStatsHtml = "";
  categorias.forEach(c => {
    const qtd = frota.filter(v => v.categoria === c).length;
    if (qtd > 0) { // Só mostra categorias com veículos
      catStatsHtml += `
        <div class="stat-card">
          <div class="stat-icon">${getCategoryEmoji(c)}</div>
          <div class="stat-value">${qtd}</div>
          <div class="stat-label">${c.charAt(0).toUpperCase() + c.slice(1)}</div>
        </div>
      `;
    }
  });

  // Helper para emojis de categoria (pode ser expandido)
  function getCategoryEmoji(cat) {
    switch(cat) {
      case 'terrestres': return '🚗';
      case 'aereos': return '✈️';
      case 'ferroviarios': return '🚆';
      case 'maritimos': return '🚢';
      case 'militares': return '🛡️';
      default: return '❓';
    }
  }

  const html = `
    <div class="stats-grid">
      <div class="stat-card primary">
        <div class="stat-icon">∑</div>
        <div class="stat-value">${total}</div>
        <div class="stat-label">Total de Veículos</div>
      </div>
      <div class="stat-card success">
        <div class="stat-icon">🟢</div>
        <div class="stat-value">${ativos}</div>
        <div class="stat-label">Ativos</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon">▶️</div>
        <div class="stat-value">${movendo}</div>
        <div class="stat-label">Em Movimento</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-icon">⛽</div>
        <div class="stat-value">${baixoComb}</div>
        <div class="stat-label">Baixo Combustível</div>
      </div>
    </div>

    <h4 style="margin-top:20px;margin-bottom:10px;">Veículos por Categoria</h4>
    <div class="stats-grid category-grid">
      ${catStatsHtml}
    </div>
  `;
  mostrarModal("📊 Estatísticas da Frota", html, `<button class="btn" onclick="fecharModal()">Fechar</button>`);
}

function abrirLog() {
  let html = `
    <h4>Logs recentes</h4>
    <div style="max-height:60vh;overflow:auto;border:1px solid var(--muted-light);border-radius:8px;padding:8px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:var(--panel-light);border-bottom:1px solid var(--muted-light);">
            <th style="padding:8px;text-align:left;width:150px;">Hora</th>
            <th style="padding:8px;text-align:left;">Evento</th>
          </tr>
        </thead>
        <tbody>
  `;
  logs.slice(0, 200).forEach(l => {
    const date = new Date(l.hora);
    const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formattedDate = date.toLocaleDateString('pt-BR');
    html += `
      <tr style="border-bottom:1px solid var(--muted-light);">
        <td style="padding:8px;font-size:0.9em;color:var(--muted);" title="${formattedDate} ${formattedTime}">${formattedTime}</td>
        <td style="padding:8px;">${l.texto}</td>
      </tr>
    `;
  });
  html += `
        </tbody>
      </table>
    </div>
    <div style="margin-top:12px;text-align:right;">
      <button class="btn" onclick="fecharModal()">Fechar</button>
    </div>
  `;
  mostrarModal('📝 Logs do Sistema', html, ``); // Footer vazio pois o botão está no HTML
}

function abrirManual() {
  const html = `
    <h2>Manual do Usuário — Gestão de Frota</h2>
    <p>Bem-vindo ao sistema de controle de frota. Aqui você encontrará instruções detalhadas para todas as funcionalidades.</p>

    <h3>1. Navegação Geral</h3>
    <ul>
      <li><strong>Sidebar:</strong> Acesso rápido às categorias, estatísticas, log, manual e mapa.</li>
      <li><strong>Topo:</strong> Legenda de status e filtros de visualização.</li>
    </ul>

    <h3>2. Veículos</h3>
    <p>Cada cartão mostra nome, status, combustível, capacidade, velocidade e mini-mapa.</p>
    <ul>
      <li><em>Ligar/Desligar:</em> Liga ou desliga o veículo.</li>
      <li><em>Mover/Parar:</em> Inicia ou interrompe o movimento.</li>
      <li><em>Ações:</em> Editar, histórico, mensagens e conexão.</li>
      <li><em>Ações Especiais:</em> Funções extras (ex.: reboque, carga).</li>
    </ul>

    <h3>3. Mapa</h3>
    <p>Exibe a frota em tempo real, com atualização automática de posição e velocidade. O botão 📍 permite seguir um veículo.</p>

    <h3>4. Modo Robô</h3>
    <p>Ativa controle automático. Ao desativar, <strong>todos os veículos são desligados</strong>.</p>

    <h3>5. Atalhos de Teclado</h3>
    <ul>
      <li><kbd>R</kbd>: Alternar modo robô</li>
      <li><kbd>M</kbd>: Abrir mapa</li>
      <li><kbd>N</kbd>: Novo veículo</li>
      <li><kbd>S</kbd>: Estatísticas</li>
      <li><kbd>L</kbd>: Log</li>
      <li><kbd>H</kbd>: Manual</li>
    </ul>

    <h3>6. Exportação e Importação</h3>
    <p>Use a barra lateral para salvar ou carregar a frota em JSON.</p>

    <h3>7. Filtros e Busca</h3>
    <p>Filtre por ativos, em movimento, conectados, seguros e baixo combustível. Também é possível ordenar e buscar por nome/categoria.</p>
  `;
  mostrarModal("📘 Manual do Usuário", html, `<button class="btn" onclick="fecharModal()">Fechar</button>`);
}

/* ---------- Small helpers ---------- */
function mostrarAlertaA11y(msg) { toast(msg); }

/* ---------- Notificações ---------- */
function renderizarNotificacoes() {
  notifMenu.innerHTML = notificacoes.length
    ? notificacoes.map(n => `
      <div class="notif-item">
        <div>${n.texto}</div>
        <small style="color:var(--muted)">${n.hora}</small>
      </div>
    `).join('')
    : '<div class="notif-item">Sem notificações.</div>';
  btnNotif.setAttribute('data-count', notificacoes.length > 0 ? notificacoes.length : ''); // Atualiza o contador visual
}

// Toggle de notificações (sino)
if (btnNotif) {
  btnNotif.addEventListener('click', () => {
    const expanded = btnNotif.getAttribute('aria-expanded') === 'true';
    btnNotif.setAttribute('aria-expanded', String(!expanded));
    notifMenu.classList.toggle('visible');
  });
}

function adicionarNotificacao(msg) {
  notificacoes.unshift({ texto: msg, hora: new Date().toLocaleTimeString() });
  if (notificacoes.length > 20) notificacoes.pop();

  renderizarNotificacoes();
}

/* ---------- Botão de Tema (Lua/Sol) ---------- */
// O listener para btnTheme já está no init() para garantir que seja anexado após o elemento existir.

/* ---------- Eventos Sidebar ---------- */
// Os listeners para os botões da sidebar já estão no init()

/* ---------- Botão "Configurações" ---------- */
function abrirConfiguracoes() {
  const temaAtual = localStorage.getItem("saaS_tema") || "claro";
  const idiomaAtual = localStorage.getItem("saaS_idioma") || "pt-BR";
  const notifAtivas = JSON.parse(localStorage.getItem("saaS_notificacoes") || "true");

  const html = `
    <form id="formConfig" onsubmit="event.preventDefault(); salvarConfiguracoes()">
      <label>Tema:
        <select name="tema" id="configTema">
          <option value="claro" ${temaAtual === "claro" ? "selected" : ""}>Claro</option>
          <option value="escuro" ${temaAtual === "escuro" ? "selected" : ""}>Escuro</option>
        </select>
      </label>

      <label>Idioma:
        <select name="idioma" id="configIdioma">
          <option value="pt-BR" ${idiomaAtual === "pt-BR" ? "selected" : ""}>Português</option>
          <option value="en-US" ${idiomaAtual === "en-US" ? "selected" : ""}>Inglês</option>
          <option value="es-ES" ${idiomaAtual === "es-ES" ? "selected" : ""}>Espanhol</option>
        </select>
      </label>

      <label>
        <input type="checkbox" id="configNotif" ${notifAtivas ? "checked" : ""}>
        Ativar notificações do sistema
      </label>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn primary" type="submit">Salvar</button>
        <button class="btn" type="button" onclick="fecharModal()">Cancelar</button>
      </div>
    </form>
  `;

  mostrarModal("⚙️ Configurações", html, ``); // Footer é gerado dentro do HTML do formulário
}

function salvarConfiguracoes() {
  const tema = document.getElementById("configTema").value;
  const idioma = document.getElementById("configIdioma").value;
  const notif = document.getElementById("configNotif").checked;

  localStorage.setItem("saaS_tema", tema);
  localStorage.setItem("saaS_idioma", idioma);
  localStorage.setItem("saaS_notificacoes", JSON.stringify(notif));

  aplicarTema(tema);

  toast("⚙️ Configurações salvas com sucesso!");
  fecharModal();
}

function aplicarTema(tema) {
  if (tema === "escuro") {
    document.body.classList.add("dark"); // Usa a classe 'dark' já existente
    if (btnTheme) btnTheme.textContent = "☀️";
  } else {
    document.body.classList.remove("dark");
    if (btnTheme) btnTheme.textContent = "🌙";
  }
}

// Aplica o tema ao carregar a página
window.addEventListener("DOMContentLoaded", () => {
  const tema = localStorage.getItem("saaS_tema") || "claro";
  aplicarTema(tema);
});

/* ---------- Filtro por categoria no sidebar ---------- */
document.querySelectorAll(".cat-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const cat = btn.dataset.cat;
    currentFilters.categoria = cat; // Atualiza o filtro de categoria
    aplicarFiltros(); // Chama aplicarFiltros para re-renderizar com o novo filtro
  });
});

/* ---------- Função para gerar frota de exemplo (se frota.json não existir) ---------- */
function gerarFrotaExemplo() {
  frota = [
    {
      "id": 1, "nome": "Toyota Corolla", "categoria": "terrestres", "capacidade": "5 passageiros", "capacidadeNum": 5, "combustivel": "Gasolina", "velocidadeMaxima": 180, "emoji": "🚗", "ativo": false, "movendo": false, "conectado": true, "seguro": false, "combustivelRestante": 85, "x": 12, "y": 34, "acoesEspeciais": [], "motorista": "João Silva"
    },
    {
      "id": 2, "nome": "Honda Civic", "categoria": "terrestres", "capacidade": "5 passageiros", "capacidadeNum": 5, "combustivel": "Gasolina", "velocidadeMaxima": 190, "emoji": "🚗", "ativo": false, "movendo": false, "conectado": false, "seguro": false, "combustivelRestante": 76, "x": 22, "y": 18, "acoesEspeciais": [], "motorista": "Maria Oliveira"
    },
    {
      "id": 3, "nome": "Tesla Model 3", "categoria": "terrestres", "capacidade": "5 passageiros", "capacidadeNum": 5, "combustivel": "Elétrico", "velocidadeMaxima": 225, "emoji": "⚡🚗", "ativo": false, "movendo": false, "conectado": true, "seguro": true, "combustivelRestante": 98, "x": 42, "y": 62, "acoesEspeciais": [], "motorista": "Carlos Souza"
    },
    {
      "id": 21, "nome": "Boeing 737-800", "categoria": "aereos", "capacidade": "189 passageiros", "capacidadeNum": 189, "combustivel": "Querosene de aviação", "velocidadeMaxima": 850, "emoji": "✈️", "ativo": false, "movendo": false, "conectado": true, "seguro": false, "combustivelRestante": 88, "x": 55, "y": 45, "acoesEspeciais": ["Carga"], "motorista": "Piloto A"
    },
    {
      "id": 32, "nome": "Alstom Coradia", "categoria": "ferroviarios", "capacidade": "300 passageiros", "capacidadeNum": 300, "combustivel": "Elétrico", "velocidadeMaxima": 200, "emoji": "🚆", "ativo": false, "movendo": false, "conectado": true, "seguro": false, "combustivelRestante": 100, "x": 5, "y": 50, "acoesEspeciais": [], "motorista": "Maquinista B"
    },
    {
      "id": 35, "nome": "Maersk Triple-E", "categoria": "maritimos", "capacidade": "180000 toneladas", "capacidadeNum": 180000, "combustivel": "Fuel Oil", "velocidadeMaxima": 23, "emoji": "🚢", "ativo": false, "movendo": false, "conectado": true, "seguro": false, "combustivelRestante": 70, "x": 80, "y": 10, "acoesEspeciais": [], "motorista": "Capitão C"
    },
    {
      "id": 41, "nome": "M1 Abrams", "categoria": "militares", "capacidade": "4 ocupantes", "capacidadeNum": 4, "combustivel": "Diesel", "velocidadeMaxima": 67, "emoji": "🛡️", "ativo": false, "movendo": false, "conectado": false, "seguro": false, "combustivelRestante": 65, "x": 44, "y": 23, "acoesEspeciais": ["Tiro"], "motorista": "Comandante D"
    }
  ];
  frota.forEach(v => velocidadeHistorico[v.id] = velocidadeHistorico[v.id] || []);
  salvarLocal();
  registrarLog('Frota de exemplo gerada.');
}

/* ---------- Inicializa ---------- */
init();