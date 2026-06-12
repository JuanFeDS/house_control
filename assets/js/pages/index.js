import { identity, PERSONAS } from '../app.js';

function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}

window.toggleTheme = function() {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('hogar_theme', next);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = next === 'dark' ? '☀' : '☾';
};

const _tb = document.getElementById('theme-btn');
if (_tb) _tb.textContent = isDark() ? '☀' : '☾';

const COLORES = ['#C8102E','#166534','#1E3A8A','#92400E','#5B21B6','#0E7490','#9D174D','#065F46'];

const saved = identity.get();
if (saved) {
  window.location.href = saved.rol === 'admin' ? 'admin.html' : 'beneficiario.html';
}

function iniciales(nombre) {
  return nombre.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function seleccionar(persona) {
  identity.set(persona);
  window.location.href = persona.rol === 'admin' ? 'admin.html' : 'beneficiario.html';
}

const beneficiarios = PERSONAS.filter(p => p.rol === 'beneficiario');
const grid = document.getElementById('personas-grid');

beneficiarios.forEach((p, i) => {
  const color     = COLORES[i % COLORES.length];
  const tipoLabel = p.tipo_participacion === 'completa' ? 'Completa' : 'Parcial';

  const btn = document.createElement('button');
  btn.className = 'persona-btn';
  btn.innerHTML = `
    <div class="persona-avatar" style="background:${color}">${iniciales(p.nombre)}</div>
    <div class="persona-info">
      <div class="persona-nombre">${p.nombre}</div>
      <div class="persona-tipo">${tipoLabel}</div>
    </div>`;
  btn.onclick = () => seleccionar(p);
  grid.appendChild(btn);
});

const admin = PERSONAS.find(p => p.rol === 'admin');
document.getElementById('admin-btn-wrap').innerHTML = `
  <button class="admin-btn" id="admin-click">
    <div class="admin-icon">⚙️</div>
    <div>
      <div class="admin-nombre">${admin.nombre}</div>
      <div class="admin-rol">Administrador</div>
    </div>
  </button>`;
document.getElementById('admin-click').onclick = () => seleccionar(admin);
