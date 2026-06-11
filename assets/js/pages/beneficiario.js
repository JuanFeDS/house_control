import {
  identity, ingresosDB, fmt,
  DATA, ventanas,
  valorCompleta, valorMedia,
  completaCount, mediaCount,
  totalBrutoIngresos, totalGastos, disponible, totalSvc, totalOtros,
  mesAnioLabel
} from '../app.js';

window.identity  = identity;
window.switchTab = switchTab;

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
  const valorMensual = tipo === 'completa' ? valorCompleta : valorMedia;
  document.getElementById('hc-tipo').textContent    = tipo === 'completa' ? 'Participación Completa' : 'Media Participación';
  document.getElementById('hc-amount').textContent  = fmt(valorMensual);
  document.getElementById('prog-total').textContent = fmt(valorMensual);

  ingresosDelMes = await ingresosDB.getMes(mes, anio);
  renderEventosPago(tipo, valorMensual);
  renderResumen();
}

function renderEventosPago(tipo, valorMensual) {
  const campoVal = tipo === 'completa' ? 'valor_completa' : 'valor_media';
  let recibido = 0;

  // Solo ventanas que distribuyen a beneficiarios
  const ventanasDist = ventanas.filter(v => v.distribuye);

  const html = ventanasDist.map(v => {
    const ingreso  = ingresosDelMes.find(i => i.fuente === v.fuente);
    const paid     = !!ingreso;
    const montoVal = paid ? (ingreso.desglose?.[campoVal] ?? v[campoVal === 'valor_completa' ? 'porCompleta' : 'porMedia']) : v[campoVal === 'valor_completa' ? 'porCompleta' : 'porMedia'];
    if (paid) recibido += montoVal;

    return `
      <div class="pago-evento">
        <div class="pe-status ${paid ? 'paid' : 'pending'}">${paid ? '✓' : '○'}</div>
        <div class="pe-info">
          <div class="pe-fuente">${v.fuente}</div>
          <div class="pe-detalle">Día ${v.dia_pago}${paid ? ` · Registrado el ${ingreso.fecha}` : ' · Pendiente'}</div>
        </div>
        <div class="pe-monto">
          <div class="amount">${fmt(montoVal)}</div>
          <div class="status-label ${paid ? 'paid' : 'pending'}">${paid ? 'Pagado' : 'Pendiente'}</div>
        </div>
      </div>`;
  }).join('');

  document.getElementById('eventos-pago').innerHTML = html;

  const pct = valorMensual > 0 ? Math.min(100, (recibido / valorMensual) * 100) : 0;
  document.getElementById('prog-recibido').textContent = fmt(recibido);
  document.getElementById('progress-fill').style.width = pct + '%';
}

function renderResumen() {
  document.getElementById('kpi-ing').textContent = fmt(totalBrutoIngresos);
  document.getElementById('kpi-gas').textContent = fmt(totalGastos);
  document.getElementById('kpi-lib').textContent = fmt(disponible);

  document.getElementById('tbody-ingresos').innerHTML = DATA.ingresos.map(i => `
    <tr>
      <td>${i.fuente}</td>
      <td>${fmt(i.valor)}</td>
      <td><span class="badge-dia">${i.dia_pago}</span></td>
    </tr>`).join('') +
    `<tr class="total-row"><td>Total</td><td>${fmt(totalBrutoIngresos)}</td><td></td></tr>`;

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

  document.getElementById('tbody-distribucion').innerHTML = ventanas.filter(v => v.distribuye).map(v => `
    <tr>
      <td>${v.fuente}</td>
      <td><span class="badge-dia">${v.dia_pago}</span></td>
      <td>${fmt(v.aporteAlFondo)}</td>
      <td>${fmt(v.porCompleta)}</td>
      <td>${fmt(v.porMedia)}</td>
    </tr>`).join('') +
    `<tr class="total-row">
      <td>Total</td><td></td>
      <td>${fmt(disponible)}</td>
      <td>${fmt(valorCompleta)}</td>
      <td>${fmt(valorMedia)}</td>
    </tr>`;
}

function switchTab(id, btn) {
  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
}

init();
