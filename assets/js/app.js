// ─────────────────────────────────────────────────────────────
// CONFIG — reemplaza con los valores de tu proyecto Supabase
// Settings > API > Project URL y anon/public key
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://TUPROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY';
const { createClient }  = window.supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────────────────
// DATOS — idéntico a data/datos.json
// ─────────────────────────────────────────────────────────────
const DATA = {
  admin: { nombre: 'Admin' },
  ingresos: [
    { fuente: 'María',    valor: 860000,  dia_pago: 2,  distribuye_beneficiarios: true  },
    { fuente: 'César',    valor: 2406000, dia_pago: 5,  distribuye_beneficiarios: true  },
    { fuente: 'Bodega',   valor: 700000,  dia_pago: 7,  distribuye_beneficiarios: false,
      nota: 'Cubre gastos intermedios días 7–16' },
    { fuente: 'Broaster', valor: 6600000, dia_pago: 17, distribuye_beneficiarios: true,
      cubre_gastos_primero: true }
  ],
  gastos_servicios: [
    { concepto: 'EPS',     valor: 440000,  dia_pago: 15 },
    { concepto: 'Claro',   valor: 151000,  dia_pago: 20 },
    { concepto: 'Gas',     valor: 150000,  dia_pago: 20 },
    { concepto: 'Luz',     valor: 1000000, dia_pago: 25 },
    { concepto: 'Agua',    valor: 325000,  dia_pago: 25 },
    { concepto: 'Codensa', valor: 15000,   dia_pago: 25 },
    { concepto: 'ETB',     valor: 70000,   dia_pago: 28 }
  ],
  gastos_otros: [
    { concepto: 'Deuda',    valor_mensual: 3000000 },
    { concepto: 'Impuesto', valor_mensual: 800000  },
    { concepto: 'Subsidio', valor_mensual: 60000   },
    { concepto: 'Puppie',   valor_mensual: 320000, frecuencia: 'cada_3_dias', valor_por_pago: 32000, primer_dia: 3 },
    { concepto: 'Gatos',    valor_mensual: 75000,  frecuencia: 'cada_3_dias', valor_por_pago: 7500,  primer_dia: 3 }
  ],
  beneficiarios: [
    { nombre: 'Persona 1', tipo: 'completa' },
    { nombre: 'Persona 2', tipo: 'completa' },
    { nombre: 'Persona 3', tipo: 'completa' },
    { nombre: 'Persona 4', tipo: 'completa' },
    { nombre: 'Persona 5', tipo: 'media'    },
    { nombre: 'Persona 6', tipo: 'media'    }
  ]
};

// Lista completa de personas para el login
const PERSONAS = [
  { nombre: DATA.admin.nombre, rol: 'admin', tipo_participacion: null },
  ...DATA.beneficiarios.map(b => ({
    nombre: b.nombre,
    rol: 'beneficiario',
    tipo_participacion: b.tipo
  }))
];

// ─────────────────────────────────────────────────────────────
// CÓMPUTOS DERIVADOS
// ─────────────────────────────────────────────────────────────
const fmt = n => '$' + Math.round(n).toLocaleString('es-CO');

const totalBrutoIngresos = DATA.ingresos.reduce((s, i) => s + i.valor, 0);
const totalSvc           = DATA.gastos_servicios.reduce((s, g) => s + g.valor, 0);
const totalOtros         = DATA.gastos_otros.reduce((s, g) => s + (g.valor_mensual || 0), 0);
const totalGastos        = totalSvc + totalOtros;
const totalIngresosDist  = DATA.ingresos
                             .filter(i => i.distribuye_beneficiarios !== false)
                             .reduce((s, i) => s + i.valor, 0);
const disponible         = totalIngresosDist - totalGastos;

const completaCount = DATA.beneficiarios.filter(b => b.tipo === 'completa').length;
const mediaCount    = DATA.beneficiarios.filter(b => b.tipo === 'media').length;
const unidades      = completaCount + mediaCount * 0.5;
const valorCompleta = Math.round(disponible / unidades);
const valorMedia    = Math.round(valorCompleta / 2);

const mascotas        = DATA.gastos_otros.filter(g => g.frecuencia === 'cada_3_dias');
const mascotasPorPago = mascotas.reduce((s, m) => s + m.valor_por_pago, 0);

const distribPorIngreso = (() => {
  let acum = 0;
  return DATA.ingresos
    .filter(i => i.distribuye_beneficiarios)
    .map(i => {
      const monto = i.cubre_gastos_primero
        ? disponible - acum
        : i.valor - mascotasPorPago;
      acum += monto;
      return {
        fuente:      i.fuente,
        dia:         i.dia_pago,
        esBroaster:  !!i.cubre_gastos_primero,
        monto,
        porCompleta: Math.round(monto / unidades),
        porMedia:    Math.round(monto / unidades / 2)
      };
    });
})();

const calEvents = (() => {
  const ev  = {};
  const add = (day, obj) => { (ev[day] = ev[day] || []).push(obj); };
  DATA.ingresos.forEach(i => add(i.dia_pago, { tipo: 'ingreso', label: `↑ ${i.fuente}` }));
  distribPorIngreso.forEach(d => {
    const sub = `×${completaCount} ${fmt(d.porCompleta)}  ·  ×${mediaCount} ${fmt(d.porMedia)}`;
    add(d.dia, { tipo: 'pago-ben', label: `→ Ben. ${fmt(d.monto)}`, sub });
  });
  DATA.gastos_servicios.forEach(g =>
    add(g.dia_pago, { tipo: 'gasto', label: `↓ ${g.concepto}` })
  );
  mascotas.forEach(m => {
    for (let d = m.primer_dia; d <= 31; d += 3)
      add(d, { tipo: 'mascota', label: `🐾 ${m.concepto}` });
  });
  return ev;
})();

// ─────────────────────────────────────────────────────────────
// IDENTITY — persiste en localStorage entre sesiones
// Primera visita: el usuario elige su nombre una sola vez.
// Siguientes visitas: se lee de localStorage, login automático.
// Se borra solo si el usuario pulsa "Cambiar" o limpia el browser.
// ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'hogar_identity';

const identity = {
  get() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  set(persona) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persona));
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = 'index.html';
  },

  // Llama al cargar cada página protegida.
  // Si ya hay identidad guardada, devuelve el usuario sin pasar por el login.
  // Si no hay identidad, redirige al login.
  require(requiredRol = null) {
    const user = this.get();
    if (!user) { window.location.href = 'index.html'; return null; }
    if (requiredRol && user.rol !== 'admin' && user.rol !== requiredRol) {
      window.location.href = 'index.html'; return null;
    }
    return user;
  }
};

// ─────────────────────────────────────────────────────────────
// PAGOS
// ─────────────────────────────────────────────────────────────
const pagosDB = {
  async getMes(mes, anio) {
    const { data } = await sb.from('pagos').select('*')
      .eq('mes', mes).eq('anio', anio).order('fecha');
    return data || [];
  },

  async crear(pago) {
    const user = identity.get();
    const { error } = await sb.from('pagos').insert({
      ...pago,
      registrado_por: user?.nombre ?? 'Admin'
    });
    return error;
  },

  async eliminar(id) {
    const { error } = await sb.from('pagos').delete().eq('id', id);
    return error;
  }
};

// ─────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function mesAnioLabel(mes, anio) {
  return `${MESES[mes - 1]} ${anio}`;
}

function buildCalendarHTML(todayDay = null) {
  let gridHtml = '', agendaHtml = '';
  for (let d = 1; d <= 31; d++) {
    const evs     = calEvents[d] || [];
    const active  = evs.length > 0;
    const isToday = d === todayDay;
    const chipsHTML = evs.map(e => {
      let out = `<span class="chip ${e.tipo}">${e.label}</span>`;
      if (e.sub) out += `<span class="chip-sub">${e.sub}</span>`;
      return out;
    }).join('');
    const cls = ['cal-cell', active ? 'active-day' : '', isToday ? 'today' : '']
      .filter(Boolean).join(' ');
    gridHtml += `<div class="${cls}"><div class="cal-day-num">${d}</div>${chipsHTML}</div>`;
    if (active) {
      agendaHtml += `
        <div class="${isToday ? 'agenda-item today' : 'agenda-item'}">
          <div class="agenda-day-badge">${d}</div>
          <div class="agenda-events">${chipsHTML}</div>
        </div>`;
    }
  }
  return { gridHtml, agendaHtml };
}
