-- path: c:\Users\gusta\ferry-boat-app\supabase\migrations\004_views.sql
create or replace view estatisticas_perfil as
select
  p.id,
  p.nome_completo,
  p.cpf,
  p.telefone,
  p.avatar_url,
  coalesce(count(pa.id) filter (where pa.cancelado_em is null), 0) as total_viagens,
  coalesce(sum(case when pa.status_pagamento = 'pago' then pa.preco_pago else 0 end), 0) as total_gasto,
  p.criado_em,
  p.atualizado_em
from perfis p
left join passagens pa on pa.usuario_id = p.id
group by p.id, p.nome_completo, p.cpf, p.telefone, p.avatar_url, p.criado_em, p.atualizado_em;