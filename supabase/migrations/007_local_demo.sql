-- Andaime local para a gravação: objetos que o app usa mas que não estão
-- em nenhuma migration do repositório (existem só em prosa no explicacao.md).
-- Não é entrega: serve para o app rodar de ponta a ponta no Supabase local.

-- colunas que o app escreve/lê e o 000_schema.sql não tem
alter table passagens add column if not exists placa_veiculo text;
alter table viagens   add column if not exists area_ocupada_m2 numeric not null default 0;
alter table viagens   add column if not exists area_total_m2 numeric;
alter table viagens   add column if not exists horario_saida_real timestamp;

update viagens set area_total_m2 = capacidade_max_veiculos * 4 where area_total_m2 is null;

-- recalc_capacidade_viagem do 002 não conhece área; estende para somar peso_veiculo_m2
create or replace function recalc_capacidade_viagem(viagem uuid) returns void language plpgsql as $$
begin
  -- o app insere as passagens da compra em paralelo (Promise.all); sem serializar,
  -- cada transacao reconta sem enxergar a outra e a ultima a commitar zera o
  -- contador da primeira. Lock advisory, e nao 'for update': o insert em passagens
  -- ja segura KEY SHARE na viagem pela FK, e subir esse lock trava em deadlock.
  perform pg_advisory_xact_lock(hashtext(viagem::text)::bigint);

  update viagens v set
    pedestres_atuais = (
      select coalesce(sum(pa.quantidade),0) from passagens pa
      where pa.viagem_id = viagem and pa.tipo_passagem = 'pedestre'
        and pa.status_pagamento = 'pago' and pa.cancelado_em is null
    ),
    veiculos_atuais = (
      select coalesce(count(*),0) from passagens pa
      where pa.viagem_id = viagem and pa.tipo_passagem = 'veiculo'
        and pa.status_pagamento = 'pago' and pa.cancelado_em is null
    ),
    area_ocupada_m2 = (
      select coalesce(sum(pa.peso_veiculo_m2),0) from passagens pa
      where pa.viagem_id = viagem and pa.tipo_passagem = 'veiculo'
        and pa.status_pagamento = 'pago' and pa.cancelado_em is null
    ),
    area_total_m2 = coalesce(v.area_total_m2, v.capacidade_max_veiculos * 4),
    atualizado_em = now()
  where v.id = viagem;
end$$;

-- view viagens_disponiveis (explicacao.md 6.1)
create or replace view viagens_disponiveis as
select
  v.id, v.data_viagem, v.horario_saida,
  v.status, v.status as status_viagem,
  r.origem, r.destino,
  e.nome as embarcacao_nome, e.operadora,
  v.pedestres_atuais, v.capacidade_max_pedestres,
  v.veiculos_atuais, v.capacidade_max_veiculos,
  coalesce(v.area_total_m2, v.capacidade_max_veiculos * 4) as area_total_m2,
  v.area_ocupada_m2,
  coalesce(v.area_total_m2, v.capacidade_max_veiculos * 4) - v.area_ocupada_m2 as area_disponivel_m2,
  h.preco_pedestre, h.preco_veiculo,
  v.capacidade_max_pedestres - v.pedestres_atuais as vagas_disponiveis,
  round(v.pedestres_atuais::numeric * 100 / nullif(v.capacidade_max_pedestres,0), 1) as percentual_ocupacao
from viagens v
join rotas r on r.id = v.rota_id
join embarcacoes e on e.id = v.embarcacao_id
join horarios h on h.id = v.horario_id
where v.data_viagem >= current_date
  and v.status in ('agendada','embarcando','atrasada')
  and v.capacidade_max_pedestres - v.pedestres_atuais > 0;

-- view minhas_passagens (explicacao.md 6.2)
create or replace view minhas_passagens as
select
  pa.*,
  v.data_viagem, v.horario_saida, v.status as status_viagem,
  r.origem, r.destino,
  e.nome as embarcacao_nome, e.operadora
from passagens pa
join viagens v on v.id = pa.viagem_id
join rotas r on r.id = v.rota_id
join embarcacoes e on e.id = v.embarcacao_id;

-- triggers em auth.users (explicacao.md 5.1.10 e 5.1.11):
-- o app manda nome/cpf/telefone no metadata do signUp e nunca insere em perfis
create or replace function criar_perfil_automatico() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (id, nome_completo, cpf, telefone, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Sem nome'),
    coalesce(new.raw_user_meta_data->>'cpf', replace(new.id::text,'-','')),
    new.raw_user_meta_data->>'telefone',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict do nothing;
  return new;
end$$;

create or replace function criar_papel_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into papeis_usuario (usuario_id, papel) values (new.id, 'usuario')
  on conflict do nothing;
  return new;
end$$;

drop trigger if exists trg_criar_perfil_automatico on auth.users;
create trigger trg_criar_perfil_automatico
after insert on auth.users for each row execute function criar_perfil_automatico();

drop trigger if exists trg_criar_papel_usuario on auth.users;
create trigger trg_criar_papel_usuario
after insert on auth.users for each row execute function criar_papel_usuario();

grant select on viagens_disponiveis, minhas_passagens to anon, authenticated;

-- O repositório não tem migration de RLS nem de grants: nenhuma tabela é
-- alcançável por anon/authenticated. Em produção isso seria RLS com políticas
-- por usuário; aqui é grant aberto só para a demo local rodar.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Reordenacao da fila (explicacao.md 5.1.7): o app insere com posicao 9999 e o
-- comentario "sera recalculado pelo trigger de reordenacao", que nao existe em
-- migration nenhuma. Sem ele a tela da fila mostra 9999o e ~19998 min.
create or replace function reordenar_fila(v_viagem uuid) returns void language plpgsql as $$
begin
  with ordem as (
    select id, row_number() over (order by prioridade, entrou_fila_em) as pos
    from fila_digital
    where viagem_id = v_viagem and status = 'aguardando'
  )
  update fila_digital f
     set posicao = ordem.pos, atualizado_em = now()
    from ordem
   where ordem.id = f.id and f.posicao is distinct from ordem.pos;
end$$;

create or replace function trg_fila_reordenar() returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext('fila:' || new.viagem_id::text)::bigint);
  perform reordenar_fila(new.viagem_id);
  return null;
end$$;

drop trigger if exists trg_fila_digital_reordenar on fila_digital;
create trigger trg_fila_digital_reordenar
after insert on fila_digital for each row execute function trg_fila_reordenar();
