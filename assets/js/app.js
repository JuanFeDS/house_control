import { createClient } from '@supabase/supabase-js';

// ─── Supabase ─────────────────────────────────────────────────
const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Datos ────────────────────────────────────────────────────
export const DATA = {
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
    { nombre: 'Completa', tipo: 'completa', cantidad: 4 },
    { nombre: 'Parcial',  tipo: 'parcial',  cantidad: 2 }
  ]
};

export const PERSONAS = [
  { nombre: DATA.admin.nombre, rol: 'admin', tipo_participacion: null },
  ...DATA.beneficiarios.map(b => ({
    nombre: b.nombre,
    rol: 'beneficiario',
    tipo_participacion: b.tipo
  }))
];

// ─── Cómputos derivados ───────────────────────────────────────
export const fmt = n => '$' + Math.round(n).toLocaleString('es-CO');

export const totalBrutoIngresos = DATA.ingresos.reduce((s, i) => s + i.valor, 0);
export const totalSvc           = DATA.gastos_servicios.reduce((s, g) => s + g.valor, 0);
export const totalOtros         = DATA.gastos_otros.reduce((s, g) => s + (g.valor_mensual || 0), 0);
export const totalGastos        = totalSvc + totalOtros;
export const totalIngresosDist  = DATA.ingresos
                                    .filter(i => i.distribuye_beneficiarios !== false)
                                    .reduce((s, i) => s + i.valor, 0);
export const disponible         = totalIngresosDist - totalGastos;

export const completaCount = DATA.beneficiarios.find(b => b.tipo === 'completa')?.cantidad ?? 1;
export const parcialCount  = DATA.beneficiarios.find(b => b.tipo === 'parcial')?.cantidad ?? 1;
const unidades             = completaCount + parcialCount * 0.5;
export const valorCompleta = Math.round(disponible / unidades);
export const valorParcial  = Math.round(valorCompleta / 2);

const mascotas        = DATA.gastos_otros.filter(g => g.frecuencia === 'cada_3_dias');
const mascotasPorPago = mascotas.reduce((s, m) => s + m.valor_por_pago, 0);
const gastosFijos     = DATA.gastos_otros.filter(g => !g.frecuencia);

export const distribPorIngreso = (() => {
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
        porParcial:    Math.round(monto / unidades / 2)
      };
    });
})();

// ─── Ventanas de tiempo ───────────────────────────────────────
export const ventanas = (() => {
  const sorted = [...DATA.ingresos].sort((a, b) => a.dia_pago - b.dia_pago);

  return sorted.map((ingreso, idx) => {
    const diaInicio = ingreso.dia_pago;
    const diaFin    = idx < sorted.length - 1 ? sorted[idx + 1].dia_pago - 1 : 31;
    const distribuye = ingreso.distribuye_beneficiarios !== false;

    const mascotasEnVentana = [];
    mascotas.forEach(m => {
      for (let d = m.primer_dia; d <= 31; d += 3) {
        if (d >= diaInicio && d <= diaFin) {
          mascotasEnVentana.push({ concepto: m.concepto, dia: d, valor: m.valor_por_pago });
        }
      }
    });

    const serviciosEnVentana = DATA.gastos_servicios.filter(
      g => g.dia_pago >= diaInicio && g.dia_pago <= diaFin
    );

    const dist = distribuye
      ? distribPorIngreso.find(d => d.fuente === ingreso.fuente)
      : null;

    return {
      fuente:            ingreso.fuente,
      valor:             ingreso.valor,
      dia_pago:          ingreso.dia_pago,
      diaInicio,
      diaFin,
      distribuye,
      esPrincipal:       !!ingreso.cubre_gastos_primero,
      nota:              ingreso.nota ?? null,
      mascotasEnVentana,
      serviciosEnVentana,
      gastosFijos:       ingreso.cubre_gastos_primero ? gastosFijos : [],
      aporteAlFondo:     dist?.monto ?? 0,
      porCompleta:       dist?.porCompleta ?? 0,
      porParcial:          dist?.porParcial ?? 0,
    };
  });
})();

export const calEvents = (() => {
  const ev  = {};
  const add = (day, obj) => { (ev[day] = ev[day] || []).push(obj); };
  DATA.ingresos.forEach(i => add(i.dia_pago, { tipo: 'ingreso', label: `↑ ${i.fuente}` }));
  distribPorIngreso.forEach(d => {
    const sub = `×${completaCount} ${fmt(d.porCompleta)}  ·  ×${parcialCount} ${fmt(d.porParcial)}`;
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

// ─── Identity ─────────────────────────────────────────────────
const STORAGE_KEY = 'hogar_identity';

export const identity = {
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
  require(requiredRol = null) {
    const user = this.get();
    if (!user) { window.location.href = 'index.html'; return null; }
    if (requiredRol && user.rol !== 'admin' && user.rol !== requiredRol) {
      window.location.href = 'index.html'; return null;
    }
    return user;
  }
};

// ─── Ingresos registrados ─────────────────────────────────────
export const ingresosDB = {
  async getMes(mes, anio) {
    const { data } = await sb.from('ingresos_registrados').select('*')
      .eq('mes', mes).eq('anio', anio).order('fecha');
    return data || [];
  },
  async crear(ingreso) {
    const user = identity.get();
    const { error } = await sb.from('ingresos_registrados').insert({
      ...ingreso,
      registrado_por: user?.nombre ?? 'Admin'
    });
    return error;
  },
  async eliminar(id) {
    const { error } = await sb.from('ingresos_registrados').delete().eq('id', id);
    return error;
  }
};

// ─── Utilidades ───────────────────────────────────────────────
export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function mesAnioLabel(mes, anio) {
  return `${MESES[mes - 1]} ${anio}`;
}

export function buildCalendarHTML(todayDay = null) {
  let gridHtml = '', agendaHtml = '';
  for (let d = 1; d <= 31; d++) {
    const evs       = calEvents[d] || [];
    const active    = evs.length > 0;
    const isToday   = d === todayDay;
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
