create table public.ingresos_registrados (
  id             uuid default gen_random_uuid() primary key,
  created_at     timestamptz default now(),
  fecha          date not null,
  fuente         text not null,
  mes            integer not null check (mes between 1 and 12),
  anio           integer not null,
  desglose       jsonb not null default '{}',
  notas          text,
  registrado_por text
);

create index ingresos_mes_anio_idx on public.ingresos_registrados (mes, anio);

grant usage  on schema public to anon;
grant select, insert, delete on public.ingresos_registrados to anon;

alter table public.ingresos_registrados enable row level security;

create policy "ingresos_select" on public.ingresos_registrados for select to anon using (true);
create policy "ingresos_insert" on public.ingresos_registrados for insert to anon with check (true);
create policy "ingresos_delete" on public.ingresos_registrados for delete to anon using (true);
