/**
 * UTILITÁRIOS DE DATA E HORA
 * Funções para formatar datas e horários com timezone de São Paulo
 */

import { format as dateFnsFormat, formatDistanceToNow } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata hora no formato HH:mm (ex: 08:30)
 */
export function formatTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const zonedDate = toZonedTime(dateObj, TIMEZONE);
    return dateFnsFormat(zonedDate, 'HH:mm', { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar hora:', error);
    return '--:--';
  }
}

/**
 * Formata data no formato dd/MM/yyyy (ex: 12/11/2025)
 */
export function formatDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const zonedDate = toZonedTime(dateObj, TIMEZONE);
    return dateFnsFormat(zonedDate, 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '--/--/----';
  }
}

/**
 * Formata data e hora completa (ex: 12/11/2025 às 08:30)
 */
export function formatDateTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const zonedDate = toZonedTime(dateObj, TIMEZONE);
    return dateFnsFormat(zonedDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data/hora:', error);
    return '--/--/---- às --:--';
  }
}

/**
 * Formata tempo relativo (ex: "há 5 minutos")
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const zonedDate = toZonedTime(dateObj, TIMEZONE);
    return formatDistanceToNow(zonedDate, { 
      addSuffix: true, 
      locale: ptBR 
    });
  } catch (error) {
    console.error('Erro ao formatar tempo relativo:', error);
    return 'tempo indisponível';
  }
}

/**
 * Converte uma string de hora (HH:mm:ss) para HH:mm
 */
export function parseTimeString(timeStr: string): string {
  if (!timeStr) return '--:--';
  
  // Se já está no formato HH:mm, retorna
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr;
  }
  
  // Se está no formato HH:mm:ss, remove os segundos
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr.substring(0, 5);
  }
  
  return timeStr;
}

/**
 * Obtém a data/hora atual no timezone de São Paulo
 */
export function getNow(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}


