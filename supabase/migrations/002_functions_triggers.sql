-- path: c:\Users\gusta\ferry-boat-app\supabase\migrations\002_functions_triggers.sql
create sequence if not exists passagens_numero_seq start 1 increment 1;

create or replace function gerar_numero_bilhete() returns trigger language plpgsql as $$
begin
  if new.numero_bilhete is null then
    new.numero_bilhete := 'FB-' || extract(year from now())::text || '-' || to_char(nextval('passagens_numero_seq'), 'FM000000');
  end if;
  return new;
end$$;

create trigger trg_passagens_numero_bilhete
before insert on passagens
for each row execute function gerar_numero_bilhete();

create or replace function gerar_codigo_qr() returns trigger language plpgsql as $$
begin
  if new.codigo_qr is null then
    new.codigo_qr := encode(digest(gen_random_uuid()::text || now()::text || coalesce(new.usuario_id::text,'') || coalesce(new.id::text,''), 'sha256'), 'hex');
  end if;
  return new;
end$$;

create trigger trg_passagens_codigo_qr
before insert on passagens
for each row execute function gerar_codigo_qr();

create or replace function recalc_capacidade_viagem(viagem uuid) returns void language plpgsql as $$
begin
  update viagens v set
    pedestres_atuais = (
      select coalesce(sum(pa.quantidade),0)
      from passagens pa
      where pa.viagem_id = viagem and pa.tipo_passagem = 'pedestre' and pa.status_pagamento = 'pago' and pa.cancelado_em is null
    ),
    veiculos_atuais = (
      select coalesce(count(*),0)
      from passagens pa
      where pa.viagem_id = viagem and pa.tipo_passagem = 'veiculo' and pa.status_pagamento = 'pago' and pa.cancelado_em is null
    ),
    atualizado_em = now()
  where v.id = viagem;
end$$;

create or replace function trg_passagens_recalc() returns trigger language plpgsql as $$
declare
  vid uuid;
begin
  if (tg_op = 'INSERT') then
    vid := new.viagem_id;
  elsif (tg_op = 'UPDATE') then
    vid := coalesce(new.viagem_id, old.viagem_id);
  else
    vid := old.viagem_id;
  end if;
  perform recalc_capacidade_viagem(vid);
  return coalesce(new, old);
end$$;

create trigger trg_passagens_recalc_capacity
after insert or update or delete on passagens
for each row execute function trg_passagens_recalc();