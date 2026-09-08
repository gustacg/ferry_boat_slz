-- RPCs de embarque, chamadas por services/boardingService.ts.
-- Descritas em explicacao.md 5.1.4 e 5.1.5.

create or replace function validar_qr_code(qr_code_hash text)
returns json language plpgsql security definer as $$
declare
  p record;
begin
  select pa.id, pa.numero_bilhete, pa.nome_passageiro, pa.tipo_passagem,
         pa.usado_em, pa.cancelado_em,
         v.id as viagem_id, v.data_viagem, v.horario_saida, v.status,
         r.origem, r.destino, e.nome as embarcacao
    into p
  from passagens pa
  join viagens v on v.id = pa.viagem_id
  join rotas r on r.id = v.rota_id
  join embarcacoes e on e.id = v.embarcacao_id
  where pa.codigo_qr = qr_code_hash;

  if not found then
    return json_build_object('success', false, 'message', 'QR Code inválido');
  end if;
  if p.cancelado_em is not null then
    return json_build_object('success', false, 'message', 'Passagem cancelada');
  end if;
  if p.usado_em is not null then
    return json_build_object('success', false, 'message', 'Passagem já utilizada');
  end if;

  return json_build_object(
    'success', true,
    'message', null,
    'data', json_build_object(
      'id', p.id,
      'numero_bilhete', p.numero_bilhete,
      'nome_passageiro', p.nome_passageiro,
      'tipo_passagem', p.tipo_passagem,
      'usado_em', p.usado_em,
      'cancelado_em', p.cancelado_em,
      'viagem', json_build_object(
        'id', p.viagem_id,
        'data_viagem', p.data_viagem,
        'horario_saida', p.horario_saida,
        'status', p.status,
        'origem', p.origem,
        'destino', p.destino,
        'embarcacao', p.embarcacao
      )
    )
  );
end$$;

create or replace function marcar_passagem_como_usada(passagem_uuid uuid)
returns json language plpgsql security definer as $$
declare
  p record;
begin
  select id, viagem_id, usado_em, cancelado_em into p
  from passagens where id = passagem_uuid;

  if not found then
    return json_build_object('success', false, 'message', 'Passagem não encontrada');
  end if;
  if p.cancelado_em is not null then
    return json_build_object('success', false, 'message', 'Passagem cancelada');
  end if;
  if p.usado_em is not null then
    return json_build_object('success', false, 'message', 'Passagem já utilizada');
  end if;

  update passagens set usado_em = now() where id = p.id;

  update fila_digital
     set status = 'embarcou', saiu_fila_em = now()
   where passagem_id = p.id and status = 'aguardando';

  -- reordena quem sobrou na fila da mesma viagem
  with ordem as (
    select id, row_number() over (order by prioridade, entrou_fila_em) as pos
    from fila_digital
    where viagem_id = p.viagem_id and status = 'aguardando'
  )
  update fila_digital f set posicao = ordem.pos
  from ordem where ordem.id = f.id;

  return json_build_object('success', true, 'message', 'Embarque confirmado');
end$$;
