import { supabase } from '@/services/supabase';
import { create } from 'zustand';

// Interface para notificação
export interface Notification {
  id: string;
  usuario_id: string;
  tipo: 'viagem_cancelada' | 'viagem_atrasada' | 'embarque_proximo' | 'embarque_agora' | 'lotacao_alta' | 'promocao' | 'sistema';
  titulo: string;
  mensagem: string;
  viagem_relacionada_id: string | null;
  dados_extras: any;
  lida: boolean;
  enviada_em: string;
  lida_em: string | null;
  prioridade: 'baixa' | 'media' | 'alta';
  criado_em: string;
}

interface NotificationsState {
  // Estado
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Ações
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: (userId: string) => Promise<void>;
  getUnreadCount: () => number;
}

/**
 * Store de Notificações
 * 
 * Gerencia todas as notificações do usuário
 */
export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  // Estado inicial
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  /**
   * Busca todas as notificações do usuário
   */
  fetchNotifications: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('usuario_id', userId)
        .order('enviada_em', { ascending: false });

      if (error) throw error;

      const notifications = (data || []) as Notification[];
      const unreadCount = notifications.filter(n => !n.lida).length;

      set({ 
        notifications,
        unreadCount,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Erro ao buscar notificações:', error);
      set({ 
        error: 'Não foi possível carregar as notificações.',
        isLoading: false 
      });
    }
  },

  /**
   * Marca uma notificação como lida
   */
  markAsRead: async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ 
          lida: true,
          lida_em: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      // Atualiza o estado local
      const notifications = get().notifications.map(n => 
        n.id === notificationId 
          ? { ...n, lida: true, lida_em: new Date().toISOString() }
          : n
      );
      
      const unreadCount = notifications.filter(n => !n.lida).length;

      set({ notifications, unreadCount });
    } catch (error: any) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  },

  /**
   * Marca todas as notificações como lidas
   */
  markAllAsRead: async (userId: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ 
          lida: true,
          lida_em: new Date().toISOString()
        })
        .eq('usuario_id', userId)
        .eq('lida', false);

      if (error) throw error;

      // Atualiza o estado local
      const notifications = get().notifications.map(n => ({
        ...n,
        lida: true,
        lida_em: n.lida ? n.lida_em : new Date().toISOString()
      }));

      set({ notifications, unreadCount: 0 });
    } catch (error: any) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  },

  /**
   * Deleta uma notificação
   */
  deleteNotification: async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Atualiza o estado local
      const notifications = get().notifications.filter(n => n.id !== notificationId);
      const unreadCount = notifications.filter(n => !n.lida).length;

      set({ notifications, unreadCount });
    } catch (error: any) {
      console.error('Erro ao deletar notificação:', error);
    }
  },

  /**
   * Recarrega as notificações
   */
  refreshNotifications: async (userId: string) => {
    await get().fetchNotifications(userId);
  },

  /**
   * Retorna quantidade de notificações não lidas
   */
  getUnreadCount: () => {
    return get().unreadCount;
  },
}));

