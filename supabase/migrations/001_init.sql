-- ─────────────────────────────────────────────────────────────
-- Tabla: pagos
-- Sin Supabase Auth — acceso con anon key directamente.
-- La identidad del usuario se maneja en localStorage del browser.
-- ─────────────────────────────────────────────────────────────
create table public.pagos (
  id             uuid default gen_random_uuid() primary key,
  created_at     timestamptz default now(),
  fecha          date not null,
  fuente         text not null,
  monto_total    numeric(12, 0) not null,
  monto_completa numeric(12, 0) not null,
  monto_media    numeric(12, 0) not null,
  mes            integer not null check (mes between 1 and 12),
  anio           integer not null,
  notas          text,
  registrado_por text  -- nombre de quien registró, ej: "Admin"
);

create index pagos_mes_anio_idx on public.pagos (mes, anio);

-- ─────────────────────────────────────────────────────────────
-- Permisos: acceso con anon key (sin login de Supabase Auth)
-- ─────────────────────────────────────────────────────────────
grant usage  on schema public to anon;
grant select, insert, delete on public.pagos to anon;

alter table public.pagos enable row level security;

create policy "pagos_select" on public.pagos for select to anon using (true);
create policy "pagos_insert" on public.pagos for insert to anon with check (true);
create policy "pagos_delete" on public.pagos for delete to anon using (true);
