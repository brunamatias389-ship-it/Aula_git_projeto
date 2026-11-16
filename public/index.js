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