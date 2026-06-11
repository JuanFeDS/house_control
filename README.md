# Distribución de Flujos del Hogar

Aplicación web estática para gestionar la distribución mensual de ingresos entre los beneficiarios del hogar. Desplegada en GitHub Pages con Supabase como backend.

## Estructura

```
├── index.html              — Login
├── admin.html              — Panel de administración (calendario, registrar pagos, historial)
├── beneficiario.html       — Vista del beneficiario (estado del mes, resumen del hogar)
├── assets/
│   └── js/
│       └── app.js          — Lógica compartida, datos, Supabase client
├── data/
│   └── datos.json          — Fuente de verdad: ingresos, gastos y beneficiarios
├── supabase/
│   └── migrations/
│       └── 001_init.sql    — Schema de base de datos + instrucciones de setup
└── archive/
    └── plan_distribucion.html  — Vista standalone de referencia (legacy)
```

## Setup

### 1. Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. Ir al **SQL Editor** y ejecutar `supabase/migrations/001_init.sql`
3. En **Authentication > Users**, crear un usuario por cada persona (admin + beneficiarios)
4. Ejecutar el INSERT de perfiles que aparece al final de `001_init.sql` con los UUIDs generados
5. Copiar la **Project URL** y la **anon/public key** desde **Settings > API**

### 2. Configuración local

Abrir `assets/js/app.js` y reemplazar:

```js
const SUPABASE_URL      = 'https://TUPROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY';
```

### 3. Datos

Editar `data/datos.json` para actualizar ingresos, gastos o beneficiarios.
Luego copiar el objeto JSON al bloque `DATA` en `assets/js/app.js` (ambos deben estar sincronizados).

### 4. GitHub Pages

1. Hacer push del repositorio a GitHub
2. Ir a **Settings > Pages**
3. Source: **Deploy from a branch**, Branch: `main`, Folder: `/ (root)`
4. La app queda disponible en `https://<usuario>.github.io/<repo>/`

## Roles

| Rol | Acceso |
|---|---|
| `admin` | Calendario, registrar pagos, historial completo |
| `beneficiario` | Su estado del mes + resumen del hogar |

## Actualizar valores

Para cambiar un ingreso, gasto o beneficiario: editar `data/datos.json`, copiar al bloque `DATA` de `app.js`, y hacer push. Todos los cómputos (disponible, distribución por ingreso, montos por beneficiario) se recalculan automáticamente.
