import {
  identity, ingresosDB, fmt,
  DATA, ventanas,
  valorCompleta, valorParcial,
  totalIngresosDist, totalGastos, disponible, totalSvc, totalOtros,
  mesAnioLabel
} from '../app.js';

window.identity      = identity;
window.switchTab     = switchTab;
window.toggleTheme   = toggleTheme;

function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}

function toggleTheme() {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('hogar_theme', next);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = next === 'dark' ? '☀' : '☾';
}

let userProfile;
let ingresosDelMes = [];

async function init() {
  const user = identity.require();
  if (!user) return;
  userProfile = user;

  const now  = new Date();
  const mes  = now.getMonth() + 1;
  const anio = now.getFullYear();

  document.getElementById('greeting-name').textContent = `Hola, ${userProfile.nombre} 👋`;
  document.getElementById('greeting-mes').textContent  = mesAnioLabel(mes, anio);
  document.getElementById('hc-mes').textContent        = mesAnioLabel(mes, anio);

  const tipo         = userProfile.tipo_participacion ?? 'completa';
  const valorMensual = tipo === 'completa' ? valorCompleta : valorParcial;
  document.getElementById('hc-tipo').textContent    = tipo === 'completa' ? 'Participación Completa' : 'Participación Parcial';
  document.getElementById('hc-amount').textContent  = fmt(valorMensual);
  document.getElementById('prog-total').textContent = fmt(valorMensual);

  ingresosDelMes = await ingresosDB.getMes(mes, anio);
  renderEventosPago(tipo, valorMensual);
  renderResumen();
}

function buildEventosHtml(tipo) {
  const campoParte = tipo === 'completa' ? 'porCompleta' : 'porParcial';
  const campoVal   = tipo === 'completa' ? 'valor_completa' : 'valor_parcial';
  let recibido = 0;

  const html = ventanas.filter(v => v.distribuye).map(v => {
    const ingreso  = ingresosDelMes.find(i => i.fuente === v.fuente);
    const paid     = !!ingreso;
    const monto    = paid ? (ingreso.desglose?.[campoVal] ?? v[campoParte]) : v[campoParte];
    if (paid) recibido += monto;

    return `
      <div class="pago-evento">
        <div class="pe-status ${paid ? 'paid' : 'pending'}">${paid ? '✓' : '○'}</div>
        <div class="pe-info">
          <div class="pe-fuente">${v.fuente}</div>
          <div class="pe-detalle">Día ${v.dia_pago}${paid ? ` · Registrado el ${ingreso.fecha}` : ' · Pendiente'}</div>
        </div>
        <div class="pe-monto">
          <div class="amount">${fmt(monto)}</div>
          <div class="status-label ${paid ? 'paid' : 'pending'}">${paid ? 'Pagado' : 'Pendiente'}</div>
        </div>
      </div>`;
  }).join('');

  return { html, recibido };
}

function renderEventosPago(tipo, valorMensual) {
  const { html, recibido } = buildEventosHtml(tipo);
  document.getElementById('eventos-pago').innerHTML = html;

  const pct = valorMensual > 0 ? Math.min(100, (recibido / valorMensual) * 100) : 0;
  document.getElementById('prog-recibido').textContent = fmt(recibido);
  document.getElementById('progress-fill').style.width = pct + '%';
}

function renderResumen() {
  const tipo   = userProfile.tipo_participacion ?? 'completa';
  const miPago = tipo === 'completa' ? valorCompleta : valorParcial;

  document.getElementById('tbody-resumen').innerHTML = `
    <tr>
      <td>Ingresos distribuibles</td>
      <td>${fmt(totalIngresosDist)}</td>
      <td>—</td>
    </tr>
    <tr>
      <td>Gastos del hogar</td>
      <td>${fmt(totalGastos)}</td>
      <td>—</td>
    </tr>
    <tr class="total-row">
      <td>Para beneficiarios</td>
      <td>${fmt(disponible)}</td>
      <td>${fmt(miPago)}</td>
    </tr>`;

  document.getElementById('tbody-ingresos').innerHTML = DATA.ingresos.map(i => `
    <tr>
      <td>${i.fuente}</td>
      <td>${fmt(i.valor)}</td>
      <td><span class="badge-dia">${i.dia_pago}</span></td>
    </tr>`).join('') +
    `<tr class="total-row"><td>Total</td><td>${fmt(totalIngresosDist)}</td><td></td></tr>`;

  document.getElementById('tbody-servicios').innerHTML = DATA.gastos_servicios.map(g => `
    <tr>
      <td>${g.concepto}</td>
      <td>${fmt(g.valor)}</td>
      <td><span class="badge-dia">${g.dia_pago}</span></td>
    </tr>`).join('') +
    `<tr class="total-row"><td>Total Servicios</td><td>${fmt(totalSvc)}</td><td></td></tr>`;

  document.getElementById('tbody-otros').innerHTML = DATA.gastos_otros.map(g => `
    <tr>
      <td>${g.concepto}</td>
      <td>${fmt(g.valor_mensual)}</td>
    </tr>`).join('') +
    `<tr class="total-row"><td>Total Otros</td><td>${fmt(totalOtros)}</td></tr>`;

  document.getElementById('distribucion-eventos').innerHTML = buildEventosHtml(tipo).html;
}

function switchTab(id, btn) {
  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
}

init();
const _themeBtn = document.getElementById('theme-btn');
if (_themeBtn) _themeBtn.textContent = isDark() ? '☀' : '☾';
