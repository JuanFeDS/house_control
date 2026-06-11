import {
  identity, ingresosDB, fmt,
  totalBrutoIngresos, totalGastos, disponible,
  completaCount, mediaCount,
  buildCalendarHTML, ventanas,
  MESES, mesAnioLabel
} from '../app.js';

window.identity         = identity;
window.switchTab        = switchTab;
window.actualizarDesglose = actualizarDesglose;
window.registrarIngreso = registrarIngreso;
window.eliminarIngreso  = eliminarIngreso;

async function init() {
  const user = identity.require('admin');
  if (!user) return;

  document.getElementById('admin-nombre').textContent = user.nombre;
  document.getElementById('kpi-ing').textContent = fmt(totalBrutoIngresos);
  document.getElementById('kpi-gas').textContent = fmt(totalGastos);
  document.getElementById('kpi-lib').textContent = fmt(disponible);

  const now = new Date();
  const { gridHtml, agendaHtml } = buildCalendarHTML(now.getDate());
  document.getElementById('cal-grid').innerHTML   = gridHtml;
  document.getElementById('cal-agenda').innerHTML = agendaHtml;

  // Selector de fuente
  const sel = document.getElementById('reg-fuente');
  ventanas.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.fuente;
    opt.textContent = `${v.fuente} — Día ${v.dia_pago}`;
    sel.appendChild(opt);
  });

  // Fecha default: hoy
  document.getElementById('reg-fecha').value = now.toISOString().split('T')[0];

  // Selectores mes/año
  const mesSelIds  = ['reg-mes', 'hist-mes'];
  const anioSelIds = ['reg-anio', 'hist-anio'];
  MESES.forEach((m, i) => {
    mesSelIds.forEach(id => {
      const o = document.createElement('option');
      o.value = i + 1; o.textContent = m;
      if (i + 1 === now.getMonth() + 1) o.selected = true;
      document.getElementById(id).appendChild(o.cloneNode(true));
    });
  });
  [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].forEach(a => {
    anioSelIds.forEach(id => {
      const o = document.createElement('option');
      o.value = a; o.textContent = a;
      if (a === now.getFullYear()) o.selected = true;
      document.getElementById(id).appendChild(o.cloneNode(true));
    });
  });

  actualizarDesglose();
  cargarIngresosMesActual();
}

// ─── Desglose de ventana ──────────────────────────────────────
function actualizarDesglose() {
  const fuente  = document.getElementById('reg-fuente').value;
  const ventana = ventanas.find(v => v.fuente === fuente);
  const wrap    = document.getElementById('desglose-wrap');
  if (!ventana) { wrap.innerHTML = ''; return; }

  const totalMascotas  = ventana.mascotasEnVentana.reduce((s, m) => s + m.valor, 0);
  const totalServicios = ventana.serviciosEnVentana.reduce((s, g) => s + g.valor, 0);
  const totalFijos     = ventana.gastosFijos.reduce((s, g) => s + g.valor_mensual, 0);

  let html = `
    <div class="desglose-ventana-badge">
      📅 Ventana: días ${ventana.diaInicio} – ${ventana.diaFin}
    </div>`;

  if (ventana.nota) {
    html += `<div class="desglose-nota">${ventana.nota}</div>`;
  }

  // Mascotas
  if (ventana.mascotasEnVentana.length) {
    const diasUnicos = [...new Set(ventana.mascotasEnVentana.map(m => m.dia))].sort((a, b) => a - b);
    const rowsHtml = diasUnicos.map(dia => {
      const pagos = ventana.mascotasEnVentana.filter(m => m.dia === dia);
      const totalDia = pagos.reduce((s, m) => s + m.valor, 0);
      const detalle  = pagos.map(m => m.concepto).join(' + ');
      return `<div class="desglose-row">
        <span class="desglose-row-label">🐾 ${detalle}<span class="desglose-row-dia">día ${dia}</span></span>
        <span class="desglose-row-val">${fmt(totalDia)}</span>
      </div>`;
    }).join('');
    html += bloque('Mascotas', totalMascotas, rowsHtml);
  }

  // Servicios
  if (ventana.serviciosEnVentana.length) {
    const rowsHtml = ventana.serviciosEnVentana.map(g => `
      <div class="desglose-row">
        <span class="desglose-row-label">${g.concepto}<span class="desglose-row-dia">día ${g.dia_pago}</span></span>
        <span class="desglose-row-val">${fmt(g.valor)}</span>
      </div>`).join('');
    html += bloque('Servicios', totalServicios, rowsHtml);
  }

  // Gastos fijos (solo Broaster)
  if (ventana.gastosFijos.length) {
    const rowsHtml = ventana.gastosFijos.map(g => `
      <div class="desglose-row">
        <span class="desglose-row-label">${g.concepto}</span>
        <span class="desglose-row-val">${fmt(g.valor_mensual)}</span>
      </div>`).join('');
    html += bloque('Gastos fijos del mes', totalFijos, rowsHtml);
  }

  // Distribución a beneficiarios
  if (ventana.distribuye) {
    html += `
      <div class="desglose-dist">
        <div class="desglose-dist-title">Distribución a beneficiarios</div>
        <div class="desglose-dist-grid">
          <div class="desglose-dist-item">
            <div class="label">Aporte al fondo</div>
            <div class="val">${fmt(ventana.aporteAlFondo)}</div>
          </div>
          <div class="desglose-dist-item">
            <div class="label">Fondo total del mes</div>
            <div class="val">${fmt(disponible)}</div>
          </div>
          <div class="desglose-dist-item">
            <div class="label">Completa (×${completaCount})</div>
            <div class="val">${fmt(ventana.porCompleta)}</div>
            <div class="sub">por persona</div>
          </div>
          <div class="desglose-dist-item">
            <div class="label">Media (×${mediaCount})</div>
            <div class="val">${fmt(ventana.porMedia)}</div>
            <div class="sub">por persona</div>
          </div>
        </div>
      </div>`;
  } else {
    html += `<div class="desglose-nota" style="border-left-color:var(--text-3)">
      ⚠ Este ingreso no distribuye a beneficiarios
    </div>`;
  }

  wrap.innerHTML = html;
}

function bloque(titulo, total, rowsHtml) {
  return `
    <div class="desglose-section">
      <div class="desglose-header">
        <span class="desglose-header-title">${titulo}</span>
        <span class="desglose-header-total">${fmt(total)}</span>
      </div>
      ${rowsHtml}
    </div>`;
}

// ─── Registro ─────────────────────────────────────────────────
async function registrarIngreso() {
  const btn    = document.getElementById('btn-registrar');
  const fuente = document.getElementById('reg-fuente').value;
  const mes    = parseInt(document.getElementById('reg-mes').value);
  const anio   = parseInt(document.getElementById('reg-anio').value);
  const fecha  = document.getElementById('reg-fecha').value;
  const notas  = document.getElementById('reg-notas').value.trim();
  const ventana = ventanas.find(v => v.fuente === fuente);

  if (!fecha) { showToast('Selecciona una fecha.', 'error'); return; }

  const desglose = {
    mascotas:    ventana.mascotasEnVentana,
    servicios:   ventana.serviciosEnVentana,
    gastos_fijos: ventana.gastosFijos,
    distribuye:   ventana.distribuye,
    aporte_fondo: ventana.aporteAlFondo,
    valor_completa: ventana.porCompleta,
    valor_media:    ventana.porMedia,
  };

  btn.disabled = true;
  const error = await ingresosDB.crear({ fecha, fuente, mes, anio, desglose, notas: notas || null });
  btn.disabled = false;

  if (error) {
    showToast('Error al registrar el ingreso.', 'error');
  } else {
    showToast(`Ingreso de ${fuente} registrado.`, 'success');
    document.getElementById('reg-notas').value = '';
    cargarIngresosMesActual();
  }
}

async function cargarIngresosMesActual() {
  const now   = new Date();
  const lista = await ingresosDB.getMes(now.getMonth() + 1, now.getFullYear());
  renderTablaIngresos('ingresos-mes-actual', lista);
}

async function cargarHistorial() {
  const mes  = parseInt(document.getElementById('hist-mes').value);
  const anio = parseInt(document.getElementById('hist-anio').value);
  const lista = await ingresosDB.getMes(mes, anio);
  renderTablaIngresos('historial-tabla', lista);
}

function renderTablaIngresos(containerId, lista) {
  const el = document.getElementById(containerId);
  if (!lista.length) {
    el.innerHTML = '<div class="empty-state">No hay ingresos registrados para este período.</div>';
    return;
  }
  const rows = lista.map(p => `
    <tr>
      <td>${p.fecha}</td>
      <td><span class="badge-fuente">${p.fuente}</span></td>
      <td>${p.notas || '—'}</td>
      <td><button class="btn-del" onclick="eliminarIngreso('${p.id}', '${containerId}')">✕</button></td>
    </tr>`).join('');
  el.innerHTML = `
    <table>
      <thead>
        <tr><th>Fecha</th><th>Fuente</th><th>Notas</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

async function eliminarIngreso(id, reloadId) {
  if (!confirm('¿Eliminar este ingreso?')) return;
  const error = await ingresosDB.eliminar(id);
  if (error) { showToast('Error al eliminar.', 'error'); return; }
  showToast('Ingreso eliminado.', 'success');
  if (reloadId === 'ingresos-mes-actual') cargarIngresosMesActual();
  else cargarHistorial();
}

function switchTab(id, btn) {
  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
  if (id === 'historial') cargarHistorial();
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

init();
