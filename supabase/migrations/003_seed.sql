-- path: c:\Users\gusta\ferry-boat-app\supabase\migrations\003_seed.sql
insert into rotas (id, origem, destino, distancia_km, duracao_base_minutos)
values
  (gen_random_uuid(), 'Terminal A', 'Terminal B', 30, 60),
  (gen_random_uuid(), 'Terminal B', 'Terminal C', 20, 45)
on conflict do nothing;

insert into embarcacoes (id, nome, operadora, capacidade_max_pedestres, capacidade_max_veiculos, ativa)
values
  (gen_random_uuid(), 'FB Atlântico', 'internacional_maritima', 250, 40, true),
  (gen_random_uuid(), 'FB Henvil I', 'henvil', 200, 35, true),
  (gen_random_uuid(), 'FB ServiPorto', 'servi_porto', 220, 38, true)
on conflict do nothing;

-- Mapear ids para criar horários
with r as (select id as rota_id from rotas order by origem limit 1),
     e as (select id as embarcacao_id from embarcacoes order by nome limit 1)
insert into horarios (id, rota_id, embarcacao_id, horario_saida, dias_semana, preco_pedestre, preco_veiculo, ativo)
select gen_random_uuid(), r.rota_id, e.embarcacao_id, t.h::time, '{1,2,3,4,5,6,0}'::int[], 10.00, 35.00, true
from r, e, (values ('08:00'),('12:00'),('16:00')) as t(h)
on conflict do nothing;

-- Gerar viagens para próximos 30 dias
insert into viagens (id, horario_id, rota_id, embarcacao_id, data_viagem, horario_saida, status, capacidade_max_pedestres, capacidade_max_veiculos)
select gen_random_uuid(),
       h.id,
       h.rota_id,
       h.embarcacao_id,
       (current_date + gs.d)::date as data_viagem,
       h.horario_saida,
       'agendada'::viagem_status,
       (select capacidade_max_pedestres from embarcacoes e where e.id = h.embarcacao_id),
       (select capacidade_max_veiculos from embarcacoes e where e.id = h.embarcacao_id)
from horarios h
cross join generate_series(0, 29) as gs(d)
where h.ativo = true
on conflict do nothing;

-- Tarifas exemplo
insert into tarifas (id, tipo, descricao, codigo, valor_vazio, valor_carregado, peso_m2, ativo)
values
  (gen_random_uuid(), 'passageiro', 'Adulto', 'PAX_ADULTO', 10.00, null, 0, true),
  (gen_random_uuid(), 'passageiro', 'Estudante', 'PAX_ESTUDANTE', 7.00, null, 0, true),
  (gen_random_uuid(), 'veiculo', 'Carro Pequeno', 'VEI_CARRO_P', 0, 0, 6.0, true),
  (gen_random_uuid(), 'veiculo', 'Motocicleta', 'VEI_MOTO', 0, 0, 2.5, true)
on conflict do nothing;