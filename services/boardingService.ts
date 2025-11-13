/**
 * BOARDING SERVICE
 * Serviço para gerenciar o embarque de passageiros
 */

import { supabase } from './supabase';

/**
 * Valida um QR code de passagem
 */
export async function validateQRCode(qrCodeHash: string) {
  try {
    const { data, error } = await supabase.rpc('validar_qr_code', {
      qr_code_hash: qrCodeHash,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao validar QR code:', error);
    throw error;
  }
}

/**
 * Marca uma passagem como usada (embarcada)
 */
export async function markTicketAsUsed(ticketId: string) {
  try {
    const { data, error } = await supabase.rpc('marcar_passagem_como_usada', {
      passagem_uuid: ticketId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao marcar passagem como usada:', error);
    throw error;
  }
}

/**
 * Busca estatísticas de embarque de uma viagem
 */
export async function getBoardingStats(tripId: string) {
  try {
    // Conta passageiros embarcados
    const { count: embarcados } = await supabase
      .from('passagens')
      .select('*', { count: 'exact', head: true })
      .eq('viagem_id', tripId)
      .not('usado_em', 'is', null);

    // Conta na fila aguardando
    const { count: aguardando } = await supabase
      .from('fila_digital')
      .select('*', { count: 'exact', head: true })
      .eq('viagem_id', tripId)
      .eq('status', 'aguardando');

    // Conta total de passagens compradas
    const { count: total } = await supabase
      .from('passagens')
      .select('*', { count: 'exact', head: true })
      .eq('viagem_id', tripId)
      .eq('status_pagamento', 'pago')
      .is('cancelado_em', null);

    return {
      embarcados: embarcados || 0,
      aguardando: aguardando || 0,
      total: total || 0,
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    throw error;
  }
}

/**
 * Inicia o embarque de uma viagem
 */
export async function startBoarding(tripId: string) {
  try {
    const { error } = await supabase
      .from('viagens')
      .update({ status: 'embarcando' })
      .eq('id', tripId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao iniciar embarque:', error);
    throw error;
  }
}

/**
 * Marca viagem como partiu
 */
export async function markTripDeparted(tripId: string) {
  try {
    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'partiu',
        horario_saida_real: new Date().toISOString(),
      })
      .eq('id', tripId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao marcar partida:', error);
    throw error;
  }
}

/**
 * Cancela uma viagem
 */
export async function cancelTrip(tripId: string, reason: string) {
  try {
    const { error } = await supabase
      .from('viagens')
      .update({
        status: 'cancelada',
        motivo_cancelamento: reason,
      })
      .eq('id', tripId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao cancelar viagem:', error);
    throw error;
  }
}



