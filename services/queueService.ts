/**
 * QUEUE SERVICE
 * Serviço para gerenciar a fila digital
 */

import { supabase } from './supabase';

/**
 * Busca posição na fila de um usuário
 */
export async function getUserQueuePosition(userId: string) {
  try {
    const { data, error } = await supabase
      .from('fila_digital')
      .select(`
        *,
        passagens!inner (
          nome_passageiro,
          tipo_passagem,
          viagens!inner (
            data_viagem,
            horario_saida,
            pedestres_atuais,
            capacidade_max_pedestres,
            veiculos_atuais,
            capacidade_max_veiculos,
            rotas!inner (
              origem,
              destino
            ),
            embarcacoes!inner (
              nome,
              operadora
            )
          )
        )
      `)
      .eq('usuario_id', userId)
      .eq('status', 'aguardando')
      .order('posicao', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar posição na fila:', error);
    throw error;
  }
}

/**
 * Conta total de pessoas na fila de uma viagem
 */
export async function getQueueCount(tripId: string) {
  try {
    const { count } = await supabase
      .from('fila_digital')
      .select('*', { count: 'exact', head: true })
      .eq('viagem_id', tripId)
      .eq('status', 'aguardando');

    return count || 0;
  } catch (error) {
    console.error('Erro ao contar fila:', error);
    throw error;
  }
}

/**
 * Busca todas as passagens de um usuário com suas viagens
 */
export async function getUserTicketsWithTrips(userId: string) {
  try {
    const { data, error } = await supabase
      .from('passagens')
      .select(`
        *,
        viagens:viagem_id (
          id,
          data_viagem,
          horario_saida,
          status,
          rotas:rota_id (
            origem,
            destino
          ),
          embarcacoes:embarcacao_id (
            nome
          )
        )
      `)
      .eq('usuario_id', userId)
      .order('comprado_em', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar passagens:', error);
    throw error;
  }
}



