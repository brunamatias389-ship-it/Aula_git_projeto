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







