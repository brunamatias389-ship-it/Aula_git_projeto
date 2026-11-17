'use strict';
const SERVICOS = [
  { id: 1, nome: 'Corte feminino', desc: 'Corte personalizado com lavagem e finalização.', dur: 60, valor: 120, esp: 'cabeleireiro' },
  { id: 2, nome: 'Corte masculino', desc: 'Corte clássico ou moderno com acabamento.', dur: 30, valor: 70, esp: 'cabeleireiro' },
  { id: 3, nome: 'Coloração', desc: 'Coloração completa com produtos de alta performance.', dur: 120, valor: 260, esp: 'cabeleireiro' },
  { id: 4, nome: 'Manicure', desc: 'Cuidado completo das unhas das mãos.', dur: 60, valor: 50, esp: 'manicure' },
  { id: 5, nome: 'Limpeza de pele', desc: 'Limpeza profunda e hidratação facial.', dur: 90, valor: 180, esp: 'esteticista' }
];

const PROFISSIONAIS = [
  { id: 1, nome: 'Carla', esp: 'cabeleireiro', ativo: true },
  { id: 2, nome: 'Marcos', esp: 'cabeleireiro', ativo: true },
  { id: 3, nome: 'Bia', esp: 'manicure', ativo: true },
  { id: 4, nome: 'Letícia', esp: 'esteticista', ativo: true },
  { id: 5, nome: 'Paulo', esp: 'cabeleireiro', ativo: false } 
];

const USUARIOS = [
  { user: 'recepcao', senha: '1234', perfil: 'recepcionista', nome: 'Recepção' },
  { user: 'carla', senha: '1234', perfil: 'profissional', profId: 1, nome: 'Carla' },
  { user: 'bia', senha: '1234', perfil: 'profissional', profId: 3, nome: 'Bia' }
];

const ABRE = 9 * 60, FECHA = 19 * 60, PASSO = 30;
const MAX_FUTUROS = 2;            // RN-05
const LIMITE_TARDIO = 120;        // RN-03 (minutos)
const DIAS_FUNC = [2, 3, 4, 5, 6]; // terça a sábado

/* ===== Utilitários ===== */
const $ = id => document.getElementById(id);
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hhmm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const soDigitos = s => (s || '').replace(/\D/g, '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isoHoje = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fmtData = iso => iso.split('-').reverse().join('/');
const diaSemana = iso => new Date(iso + 'T00:00:00').getDay();
const instante = (iso, min) => new Date(iso + 'T00:00:00').getTime() + min * 6e4;
const servicoPorId = id => SERVICOS.find(s => s.id === +id);
const profPorId = id => PROFISSIONAIS.find(p => p.id === +id);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function ler(chave, padrao) {
  try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch { return padrao; }
}
function gravar(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* armazenamento indisponível */ }
}
const getAg = () => ler('lumiere_ag', []);
const setAg = v => gravar('lumiere_ag', v);

const ativo = a => a.status === 'agendado' || a.status === 'confirmado';
const futuro = a => ativo(a) && instante(a.data, a.inicio) > Date.now();

function msg(el, texto, tipo) {
  el.textContent = texto;
  el.className = 'msg ' + (tipo || '');
}

function renderVitrine() {
  $('listaServicos').innerHTML = SERVICOS.map(s => `
    <article class="card">
      <span class="tag">${esc(s.esp)}</span>
      <h3>${esc(s.nome)}</h3>
      <p>${esc(s.desc)}</p>
      <div class="meta"><span>${s.dur} min</span><span class="preco">${brl(s.valor)}</span></div>
    </article>`).join('');

    $('listaProfs').innerHTML = PROFISSIONAIS.filter(p => p.ativo).map(p => `
    <article class="card">
      <span class="tag">${esc(p.esp)}</span>
      <h3>${esc(p.nome)}</h3>
    </article>`).join('');
}

function horariosLivres(profId, data, dur) {
  const prof = profPorId(profId);
  if (!prof || !prof.ativo) return [];
  if (!DIAS_FUNC.includes(diaSemana(data))) return [];
  const ocupados = getAg().filter(a => a.profId === prof.id && a.data === data && ativo(a));
  const livres = [];
  for (let ini = ABRE; ini + dur <= FECHA; ini += PASSO) {
    const fim = ini + dur;
    if (instante(data, ini) <= Date.now()) continue;
    if (ocupados.some(o => ini < o.fim && fim > o.inicio)) continue;
    livres.push(ini);
  }
  return livres;
}

let slotEscolhido = null;

function atualizarProfissionais() {
  const s = servicoPorId($('servico').value);
  const opcoes = PROFISSIONAIS.filter(p => p.ativo && p.esp === s.esp);
  $('profissional').innerHTML = opcoes.map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('');
  $('infoServico').textContent = `${s.nome}: ${s.dur} minutos · ${brl(s.valor)}`;
}

function atualizarSlots() {
  slotEscolhido = null;
  const box = $('slots');
  const data = $('data').value;
  if (!data) { box.innerHTML = '<p class="dica">Escolha serviço, profissional e data.</p>'; return; }
  if (!DIAS_FUNC.includes(diaSemana(data))) {
    box.innerHTML = '<p class="dica">Atendemos de terça a sábado. Escolha outra data.</p>'; return;
  }
  const s = servicoPorId($('servico').value);
  const livres = horariosLivres($('profissional').value, data, s.dur);
  if (!livres.length) { box.innerHTML = '<p class="dica">Sem horários livres nesta data.</p>'; return; }
  box.innerHTML = livres.map(m => `<button type="button" class="slot" data-min="${m}">${hhmm(m)}</button>`).join('');
}

function agendar() {
  const out = $('msgAgendar');
  const nome = $('nome').value.trim();
  const tel = soDigitos($('telefone').value);
  const data = $('data').value;
  const s = servicoPorId($('servico').value);
  const profId = +$('profissional').value;

  if (!nome || !tel) return msg(out, 'Informe nome e telefone.', 'erro');
  if (tel.length < 10 || tel.length > 11) return msg(out, 'Telefone inválido. Informe o DDD e o número.', 'erro');
  if (!data) return msg(out, 'Escolha a data.', 'erro');
  if (slotEscolhido === null) return msg(out, 'Escolha um horário.', 'erro');
  if (!$('lgpd').checked) return msg(out, 'É necessário autorizar o uso dos dados (LGPD).', 'erro');

  const clientes = ler('lumiere_cli', {});
  const existente = clientes[tel];
  clientes[tel] = {
    nome: existente ? existente.nome : nome,
    email: $('email').value.trim() || (existente && existente.email) || '',
    nascimento: $('nascimento').value || (existente && existente.nascimento) || ''
  };
  gravar('lumiere_cli', clientes);

  const todos = getAg();
  if (todos.filter(a => a.tel === tel && futuro(a)).length >= MAX_FUTUROS)
    return msg(out, `Cada cliente pode ter no máximo ${MAX_FUTUROS} agendamentos futuros ativos.`, 'erro');

  const fim = slotEscolhido + s.dur;
  if (todos.some(a => a.profId === profId && a.data === data && ativo(a) && slotEscolhido < a.fim && fim > a.inicio)) {
    atualizarSlots();
    return msg(out, 'Esse horário acabou de ser ocupado. Escolha outro.', 'erro');
  }

  todos.push({
    id: Date.now(), nome: clientes[tel].nome, tel, servicoId: s.id, profId, data,
    inicio: slotEscolhido, fim, status: 'agendado', tardio: false
  });
  setAg(todos);

  msg(out, `Agendado! ${s.nome} com ${profPorId(profId).nome} em ${fmtData(data)}, das ${hhmm(slotEscolhido)} às ${hhmm(fim)}. Valor: ${brl(s.valor)}.`, 'ok');
  atualizarSlots();
}

function cancelar(id) {
  const todos = getAg();
  const a = todos.find(x => x.id === id);
  if (!a || !ativo(a)) return;
  if (!confirm('Deseja cancelar este agendamento?')) return;
  a.tardio = instante(a.data, a.inicio) - Date.now() < LIMITE_TARDIO * 6e4;
  a.status = 'cancelado';
  setAg(todos);
  atualizarSlots();
}

function linhaAg(a, acoes) {
  const s = servicoPorId(a.servicoId), p = profPorId(a.profId);
  return `<div class="item">
    <div><strong>${esc(s.nome)}</strong> com ${esc(p.nome)}<br>
    <small>${fmtData(a.data)} · ${hhmm(a.inicio)}–${hhmm(a.fim)}${acoes.mostrarCliente ? ' · ' + esc(a.nome) + ' (' + esc(a.tel) + ')' : ''}</small></div>
    <div><span class="status ${a.status}">${a.status}${a.tardio ? ' (tardio)' : ''}</span>${acoes.botoes || ''}</div>
  </div>`;
}

function renderMeus() {
  const tel = soDigitos($('telConsulta').value);
  const box = $('meusAgendamentos');
  if (tel.length < 10) { box.innerHTML = '<p class="dica">Informe o telefone usado no agendamento.</p>'; return; }
  const lista = getAg().filter(a => a.tel === tel).sort((x, y) => instante(y.data, y.inicio) - instante(x.data, x.inicio));
  box.innerHTML = lista.length
    ? lista.map(a => linhaAg(a, { botoes: ativo(a) ? `<button class="btn-mini perigo" data-cancelar="${a.id}">Cancelar</button>` : '' })).join('')
    : '<p class="dica">Nenhum agendamento encontrado.</p>';
}

let sessao = null;

function login() {
  const out = $('msgLogin');
  const bloqueio = ler('lumiere_bloqueio', 0);
  if (Date.now() < bloqueio) {
    return msg(out, `Conta bloqueada. Tente novamente em ${Math.ceil((bloqueio - Date.now()) / 60000)} min.`, 'erro');
  }
  const u = USUARIOS.find(x => x.user === $('loginUser').value.trim().toLowerCase() && x.senha === $('loginSenha').value);
  if (!u) {
    const n = ler('lumiere_tentativas', 0) + 1;
    gravar('lumiere_tentativas', n);
    if (n >= 3) {
      gravar('lumiere_bloqueio', Date.now() + 15 * 60000);
      gravar('lumiere_tentativas', 0);
      return msg(out, 'Três tentativas falhas. Conta bloqueada por 15 minutos.', 'erro');
    }
    return msg(out, `Credenciais inválidas. Tentativa ${n} de 3.`, 'erro');
  }
  gravar('lumiere_tentativas', 0);
  sessao = u;
  msg(out, '');
  $('loginSenha').value = '';
  $('telaLogin').hidden = true;
  $('telaPainel').hidden = false;
  $('tituloPainel').textContent = u.perfil === 'recepcionista' ? 'Agenda geral' : `Agenda de ${u.nome}`;
  
  const hoje = isoHoje();
  let dataInicial = hoje;
  
  if (u.perfil === 'profissional') {
    const todos = getAg().filter(a => a.profId === u.profId && ativo(a));
    const futuros = todos.filter(a => a.data >= hoje).map(a => a.data);
    futuros.sort(); 
    
    if (futuros.length > 0 && futuros[0] > hoje) {
      dataInicial = futuros[0];
    }
  }
  
  $('dataPainel').value = dataInicial;

  renderPainel();
    if (u.perfil === 'recepcionista') abrirPainelRecepcao();
}

function renderPainel() {
  if (!sessao) return;
  const data = $('dataPainel').value;
  let lista = getAg().filter(a => a.data === data);
  if (sessao.perfil === 'profissional') lista = lista.filter(a => a.profId === sessao.profId);
  lista.sort((x, y) => x.inicio - y.inicio);
  $('tabelaAgenda').innerHTML = lista.length ? lista.map(a => {
    let b = '';
    if (sessao.perfil === 'recepcionista') {
      if (a.status === 'agendado') b += `<button class="btn-mini" data-confirmar="${a.id}">Confirmar presença</button>`;
      if (ativo(a)) b += `<button class="btn-mini perigo" data-cancelar="${a.id}">Cancelar</button>`;
    } else if (a.status === 'confirmado') {
      b += `<button class="btn-mini" data-realizado="${a.id}">Registrar atendimento</button>`;
    }
    return linhaAg(a, { mostrarCliente: true, botoes: b });
  }).join('') : '<p class="dica">Sem agendamentos nesta data.</p>';
    if (sessao.perfil === 'recepcionista') renderRecepcao();
}

function mudarStatus(id, novo) {
  const todos = getAg();
  const a = todos.find(x => x.id === id);
  if (!a) return;
  if (novo === 'realizado' && a.status !== 'confirmado') return; // RN-07
  if (novo === 'confirmado' && a.status !== 'agendado') return;
  a.status = novo;
  setAg(todos);
  renderPainel();
}

function sair() {
  sessao = null;
  $('telaPainel').hidden = true;
  $('telaLogin').hidden = false;
}

document.addEventListener('DOMContentLoaded', () => {
  renderVitrine();

  $('servico').innerHTML = SERVICOS.map(s => `<option value="${s.id}">${esc(s.nome)}</option>`).join('');
  atualizarProfissionais();

  const hoje = isoHoje();
  $('data').min = hoje;
  $('nascimento').max = hoje;

  $('servico').addEventListener('change', () => { atualizarProfissionais(); atualizarSlots(); });
  $('profissional').addEventListener('change', atualizarSlots);
  $('data').addEventListener('change', atualizarSlots);

  $('slots').addEventListener('click', e => {
    const b = e.target.closest('.slot');
    if (!b) return;
    document.querySelectorAll('.slot').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel');
    slotEscolhido = +b.dataset.min;
  });

   $('btnAgendar').addEventListener('click', agendar);
  $('btnConsultar').addEventListener('click', renderMeus);

  document.body.addEventListener('click', e => {
    const c = e.target.closest('[data-cancelar]');
    if (c) { cancelar(+c.dataset.cancelar); renderMeus(); renderPainel(); }
    const k = e.target.closest('[data-confirmar]');
    if (k) mudarStatus(+k.dataset.confirmar, 'confirmado');
    const r = e.target.closest('[data-realizado]');
    if (r) mudarStatus(+r.dataset.realizado, 'realizado');
  });

  const dlg = $('dlgEquipe');
  $('btnEquipe').addEventListener('click', () => dlg.showModal());
  $('fecharEquipe').addEventListener('click', () => dlg.close());
  $('btnLogin').addEventListener('click', login);
  $('loginSenha').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  $('btnSair').addEventListener('click', sair);
  $('dataPainel').addEventListener('change', renderPainel);
});

const DIAS_NOME = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
let agAberto = null; // agendamento com detalhes abertos

const somarDias = (iso, n) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
};

function limitesSemana(hoje) {
  const dow = diaSemana(hoje);
  const ini = somarDias(hoje, dow === 0 ? -6 : 1 - dow);
  return [ini, somarDias(ini, 6)];
}

function rotuloData(iso, hoje) {
  const nome = DIAS_NOME[diaSemana(iso)];
  if (iso === hoje) return `Hoje · ${fmtData(iso).slice(0, 5)} · ${nome}`;
  if (iso === somarDias(hoje, 1)) return `Amanhã · ${fmtData(iso).slice(0, 5)} · ${nome}`;
  return `${iso < hoje ? fmtData(iso) : fmtData(iso).slice(0, 5)} · ${nome}`;
}

function detalheAg(a, s, p) {
  const cli = ler('lumiere_cli', {})[a.tel] || {};
  let b = '';
  if (a.status === 'agendado') b += `<button class="btn-mini" data-confirmar="${a.id}">Confirmar presença</button>`;
  if (ativo(a)) b += `<button class="btn-mini perigo" data-cancelar="${a.id}">Cancelar</button>`;
  return `<div class="ag-det">
    <dl>
      <div><dt>Telefone</dt><dd>${esc(a.tel)}</dd></div>
      <div><dt>E-mail</dt><dd>${esc(cli.email || '—')}</dd></div>
      <div><dt>Nascimento</dt><dd>${cli.nascimento ? fmtData(cli.nascimento) : '—'}</dd></div>
      <div><dt>Data e horário</dt><dd>${fmtData(a.data)} · ${hhmm(a.inicio)}–${hhmm(a.fim)}</dd></div>
      <div><dt>Serviço</dt><dd>${esc(s.nome)} · ${s.dur} min · ${brl(s.valor)}</dd></div>
      <div><dt>Profissional</dt><dd>${esc(p.nome)}</dd></div>
    </dl>
    <div class="ag-acoes">${b}</div>
  </div>`;
}

function linhaRecepcao(a) {
  const s = servicoPorId(a.servicoId), p = profPorId(a.profId);
  const aberto = agAberto === a.id;
  return `<div class="ag ${aberto ? 'aberto' : ''}">
    <button type="button" class="ag-linha" data-detalhe="${a.id}" aria-expanded="${aberto}">
      <span class="ag-hora">${hhmm(a.inicio)}</span>
      <span class="ag-cli"><strong>${esc(a.nome)}</strong><small>${esc(s.nome)}</small></span>
      <span class="ag-prof">${esc(p.nome)}</span>
      <span class="status ${a.status}">${a.status}${a.tardio ? ' (tardio)' : ''}</span>
    </button>
    ${aberto ? detalheAg(a, s, p) : ''}
  </div>`;
}

function renderRecepcao() {
  if (!sessao || sessao.perfil !== 'recepcionista') return;
  const hoje = isoHoje();
  const todos = getAg();
  const [semIni, semFim] = limitesSemana(hoje);
  const limite7 = somarDias(hoje, 7);

  $('kpiHoje').textContent = todos.filter(a => ativo(a) && a.data === hoje).length;
  $('kpiProximos').textContent = todos.filter(a => futuro(a) && a.data <= limite7).length;
  $('kpiSemana').textContent = todos.filter(a => ativo(a) && a.data >= semIni && a.data <= semFim).length;
  $('kpiFuturos').textContent = todos.filter(futuro).length;

  const periodo = $('filtroPeriodo').value, dataSel = $('filtroData').value;
  const prof = $('filtroProf').value, st = $('filtroStatus').value;
  const busca = $('filtroBusca').value.trim().toLowerCase();
  const buscaTel = soDigitos(busca);

  const lista = todos.filter(a => {
    if (dataSel) { if (a.data !== dataSel) return false; }
    else if (periodo === 'hoje') { if (a.data !== hoje) return false; }
    else if (periodo === 'semana') { if (a.data < semIni || a.data > semFim) return false; }
    else if (periodo === 'proximos') { if (a.data < hoje) return false; }
    if (prof && a.profId !== +prof) return false;
    if (st === 'ativos' && !ativo(a)) return false;
    if (busca && !(a.nome.toLowerCase().includes(busca) || (buscaTel && a.tel.includes(buscaTel)))) return false;
    return true;
  }).sort((x, y) => x.data.localeCompare(y.data) || x.inicio - y.inicio);

  const grupos = {};
  lista.forEach(a => (grupos[a.data] = grupos[a.data] || []).push(a));
  const datas = Object.keys(grupos).sort();
  const ordem = datas.filter(d => d >= hoje).concat(datas.filter(d => d < hoje).reverse());

  $('listaRecepcao').innerHTML = ordem.length
    ? ordem.map(d => `<section class="dia">
        <h4>${rotuloData(d, hoje)} <span>${grupos[d].length} agendamento(s)</span></h4>
        ${grupos[d].map(linhaRecepcao).join('')}
      </section>`).join('')
    : '<p class="dica">Nenhum agendamento encontrado com esses filtros.</p>';
}

function limparFiltros() {
  $('filtroPeriodo').value = 'proximos';
  $('filtroData').value = '';
  $('filtroProf').value = '';
  $('filtroStatus').value = 'ativos';
  $('filtroBusca').value = '';
  renderRecepcao();
}

function mostrarPainelRecepcao() {
  $('telaPainel').hidden = true;
  $('telaRecepcao').hidden = false;
  $('btnVoltarPainel').hidden = true;
  $('dlgEquipe').classList.add('amplo');
  renderRecepcao();
}

function abrirPainelRecepcao() {
  $('filtroProf').innerHTML = '<option value="">Todos os profissionais</option>' +
    PROFISSIONAIS.filter(p => p.ativo).map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join('');
  agAberto = null;
  mostrarPainelRecepcao();
  limparFiltros();
}

function limparRecepcao() {
  $('telaRecepcao').hidden = true;
  $('btnVoltarPainel').hidden = true;
  $('dlgEquipe').classList.remove('amplo');
  agAberto = null;
}

function iniciarPainelRecepcao() {
  ['filtroPeriodo', 'filtroData', 'filtroProf', 'filtroStatus'].forEach(id => $(id).addEventListener('change', renderRecepcao));
  $('filtroBusca').addEventListener('input', renderRecepcao);
  $('btnLimparFiltros').addEventListener('click', limparFiltros);

  $('listaRecepcao').addEventListener('click', e => {
    const d = e.target.closest('[data-detalhe]');
    if (!d) return;
    const id = +d.dataset.detalhe;
    agAberto = agAberto === id ? null : id;
    renderRecepcao();
  });

  $('btnCalendario').addEventListener('click', () => {
    $('telaRecepcao').hidden = true;
    $('telaPainel').hidden = false;
    $('btnVoltarPainel').hidden = false;
    $('dlgEquipe').classList.remove('amplo');
    renderPainel();
  });
  $('btnVoltarPainel').addEventListener('click', mostrarPainelRecepcao);

  $('btnSairRecep').addEventListener('click', () => { sair(); limparRecepcao(); });
  $('btnSair').addEventListener('click', limparRecepcao);

  $('btnEquipe').addEventListener('click', renderRecepcao);
  window.addEventListener('storage', e => { if (e.key === 'lumiere_ag') renderRecepcao(); });
}
document.addEventListener('DOMContentLoaded', iniciarPainelRecepcao);










