-- El sí y la llegada se parten. Este archivo sólo agrega el valor y la
-- fecha: Postgres no deja usar un enum recién agregado en la misma
-- transacción.

alter type public.pledge_status add value if not exists 'accepted';

alter table public.donation_pledges
  add column accepted_at timestamptz;

comment on column public.donation_pledges.accepted_at is
  'Cuándo el equipo confirmó que van a donar. Se conserva al entregar. Se limpia al soltar.';
