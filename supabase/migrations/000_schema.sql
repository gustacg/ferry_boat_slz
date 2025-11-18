-- path: c:\Users\gusta\ferry-boat-app\supabase\migrations\001_schema.sql
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'viagem_status') then
    create type viagem_status as enum ('agendada','embarcando','partiu','chegou','cancelada','atrasada');
  end if;
  if not exists (select 1 from pg_type where typname = 'pagamento_status') then
    create type pagamento_status as enum ('pendente','pago','reembolsado','falhou');
  end if;
  if not exists (select 1 from pg_type where typname = 'tipo_passagem') then
    create type tipo_passagem as enum ('pedestre','veiculo');
  end if;
  if not exists (select 1 from pg_type where typname = 'notificacao_tipo') then
    create type notificacao_tipo as enum ('viagem_cancelada','viagem_atrasada','embarque_proximo','embarque_agora','lotacao_alta','promocao','sistema');
  end if;
  if not exists (select 1 from pg_type where typname = 'notificacao_prioridade') then
    create type notificacao_prioridade as enum ('baixa','media','alta');
  end if;
  if not exists (select 1 from pg_type where typname = 'operadora_tipo') then
    create type operadora_tipo as enum ('internacional_maritima','henvil','servi_porto');
  end if;
  if not exists (select 1 from pg_type where typname = 'fila_status') then
    create type fila_status as enum ('aguardando','embarcando','embarcou','perdeu','cancelou');
  end if;
end$$;

create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_completo text not null,
  cpf text unique not null,
  telefone text null,
  avatar_url text null,
  total_viagens int not null default 0,
  total_gasto numeric not null default 0,
  criado_em timestamp not null default now(),
  atualizado_em timestamp not null default now()
);

create table if not exists rotas (
  id uuid primary key default gen_random_uuid(),
  origem text not null,
  destino text not null,
  distancia_km numeric null,
  duracao_base_minutos int not null,
  ativa boolean not null default true,
  criado_em timestamp not null default now(),
  atualizado_em timestamp not null default now()
);

create table if not exists embarcacoes (
  id uuid primary key default gen_random_uuid(),
  nome text unique not null,
  operadora operadora_tipo not null,
  capacidade_max_pedestres int not null check (capacidade_max_pedestres > 0),
  capacidade_max_veiculos int not null check (capacidade_max_veiculos >= 0),
  ativa boolean not null default true,
  ultima_manutencao date null,
  proxima_manutencao date null,
  criado_em timestamp not null default now(),
  atualizado_em timestamp not null default now()
);

create table if not exists horarios (
  id uuid primary key default gen_random_uuid(),
  rota_id uuid not null references rotas(id) on delete cascade,
  embarcacao_id uuid not null references embarcacoes(id) on delete restrict,
  horario_saida time not null,
  dias_semana int[] not null,
  preco_pedestre numeric not null check (preco_pedestre >= 0),
  preco_veiculo numeric not null check (preco_veiculo >= 0),
  ativo boolean not null default true,
  criado_em timestamp not null default now(),
  atualizado_em timestamp not null default now()
);

create table if not exists viagens (
  id uuid primary key default gen_random_uuid(),
  horario_id uuid not null references horarios(id) on delete cascade,
  rota_id uuid not null references rotas(id) on delete cascade,
  embarcacao_id uuid not null references embarcacoes(id) on delete restrict,
  data_viagem date not null,
  horario_saida time not null,
  status viagem_status not null default 'agendada',
  pedestres_atuais int not null default 0 check (pedestres_atuais >= 0),
  veiculos_atuais int not null default 0 check (veiculos_atuais >= 0),
  capacidade_max_pedestres int not null check (capacidade_max_pedestres > 0),
  capacidade_max_veiculos int not null check (capacidade_max_veiculos >= 0),
  motivo_cancelamento text null,
  minutos_atraso int null,
  criado_em timestamp not null default now(),
  atualizado_em timestamp not null default now()
);

create table if not exists tarifas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('passageiro','veiculo')),
  descricao text unique not null,
  codigo text unique not null,
  valor_vazio numeric not null default 0,
  valor_carregado numeric null default 0,
  peso_m2 numeric not null default 0,
  ativo boolean not null default true,
  criado_em timestamp not null default now(),
  atualizado_em timestamp not null default now()
);

create table if not exists passagens (
  id uuid primary key default gen_random_uuid(),
  numero_bilhete text unique null,
  usuario_id uuid not null references perfis(id) on delete cascade,
  viagem_id uuid not null references viagens(id) on delete cascade,
  tipo_passagem tipo_passagem not null,
  nome_passageiro text not null,
  cpf_passageiro text not null,
  quantidade int not null default 1 check (quantidade > 0),
  preco_pago numeric not null default 0 check (preco_pago >= 0),
  status_pagamento pagamento_status not null default 'pendente',
  metodo_pagamento text null,
  id_pagamento_externo text null,
  codigo_qr text unique null,
  comprado_em timestamp not null default now(),
  usado_em timestamp null,
  cancelado_em timestamp null,
  motivo_cancelamento text null,
  valor_reembolso numeric null,
  categoria_passageiro text not null default 'adulto',
  idade int null,
  modelo_veiculo text null,
  categoria_veiculo text null,
  peso_veiculo_m2 numeric not null default 0,
  grupo_id uuid null,
  tarifa_id uuid null references tarifas(id),
  eh_carregado boolean not null default false,
  criado_em timestamp not null default now(),
  atualizado_em timestamp not null default now()
);

create table if not exists fila_digital (
  id uuid primary key default gen_random_uuid(),
  passagem_id uuid not null unique references passagens(id) on delete cascade,
  viagem_id uuid not null references viagens(id) on delete cascade,
  usuario_id uuid not null references perfis(id) on delete cascade,
  posicao int not null check (posicao > 0),
  horario_embarque_estimado timestamp null,
  entrou_fila_em timestamp not null default now(),
  saiu_fila_em timestamp null,
  status fila_status not null default 'aguardando',
  prioridade int not null default 5,
  criado_em timestamp not null default now(),
  atualizado_em timestamp not null default now()
);

create table if not exists notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid null references perfis(id) on delete set null,
  tipo notificacao_tipo not null,
  titulo text not null,
  mensagem text not null,
  viagem_relacionada_id uuid null references viagens(id) on delete set null,
  dados_extras jsonb null,
  lida boolean not null default false,
  enviada_em timestamp not null default now(),
  lida_em timestamp null,
  prioridade notificacao_prioridade not null default 'media',
  criado_em timestamp not null default now()
);

create table if not exists papeis_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  papel text not null check (papel in ('admin','operador','usuario')),
  criado_em timestamp not null default now()
);

create index if not exists idx_passagens_usuario on passagens(usuario_id);
create index if not exists idx_passagens_viagem on passagens(viagem_id);
create index if not exists idx_fila_viagem_status on fila_digital(viagem_id, status);
create index if not exists idx_viagens_data_status on viagens(data_viagem, status);