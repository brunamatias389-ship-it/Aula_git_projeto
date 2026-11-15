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

