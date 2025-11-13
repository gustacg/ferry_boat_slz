import { supabase } from '@/services/supabase';
import { Ticket } from '@/types';
import { parseTimeString } from '@/utils/dateUtils';
import { create } from 'zustand';

type TicketFilter = 'all' | 'active' | 'used' | 'cancelled';

interface TicketsState {
  // Estado
  tickets: Ticket[];
  filter: TicketFilter;
  isLoading: boolean;
  error: string | null;

  // Ações
  fetchTickets: (userId: string) => Promise<void>;
  setFilter: (filter: TicketFilter) => void;
  getTicketById: (id: string) => Ticket | undefined;
  refreshTickets: (userId: string) => Promise<void>;
  getFilteredTickets: () => Ticket[];
}

/**
 * Store de Passagens (Tickets)
 * 
 * Gerencia todas as passagens do usuário
 * 
 * Como usar:
 * ```tsx
 * import { useTicketsStore } from '@/stores/ticketsStore';
 * import { useAuthStore } from '@/stores/authStore';
 * 
 * function TicketsScreen() {
 *   const { user } = useAuthStore();
 *   const { tickets, fetchTickets, filter, setFilter } = useTicketsStore();
 *   
 *   useEffect(() => {
 *     if (user) {
 *       fetchTickets(user.id);
 *     }
 *   }, [user]);
 *   
 *   return (
 *     <View>
 *       <FilterButtons 
 *         active={filter} 
 *         onSelect={setFilter} 
 *       />
 *       <TicketsList tickets={tickets} />
 *     </View>
 *   );
 * }
 * ```
 */
export const useTicketsStore = create<TicketsState>((set, get) => ({
  // Estado inicial
  tickets: [],
  filter: 'all',
  isLoading: false,
  error: null,

  /**
   * Busca todas as passagens do usuário usando a tabela passagens com joins
   */
  fetchTickets: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Busca passagens diretamente da tabela passagens com joins manuais
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

      // Função auxiliar para calcular horário de chegada
      const calculateArrivalTime = (departureTime: string, durationMinutes: number = 90): string => {
        try {
          // Se departure_time está em formato HH:mm ou HH:mm:ss
          const timeParts = departureTime.split(':');
          const hours = parseInt(timeParts[0], 10);
          const minutes = parseInt(timeParts[1], 10);
          
          if (isNaN(hours) || isNaN(minutes)) return departureTime;
          
          // Calcula total de minutos
          const totalMinutes = hours * 60 + minutes + durationMinutes;
          
          // Converte de volta para HH:mm
          const newHours = Math.floor(totalMinutes / 60) % 24;
          const newMinutes = totalMinutes % 60;
          
          return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
        } catch {
          return departureTime;
        }
      };

      // Mapeia dados da tabela para o formato esperado pelo app
      const mappedTickets: Ticket[] = (data || []).map((passagem: any) => {
        const viagem = passagem.viagens || {};
        const rota = viagem.rotas || {};
        const embarcacao = viagem.embarcacoes || {};
        const departureTime = parseTimeString(viagem.horario_saida || '');
        
        return {
          id: passagem.id,
          ticket_code: passagem.numero_bilhete,
          user_id: userId,
          trip_id: passagem.viagem_id || '',
          passenger_name: passagem.nome_passageiro || '',
          passenger_cpf: passagem.cpf_passageiro || '',
          passenger_category: passagem.categoria_passageiro === 'adulto' ? 'adult' :
                             passagem.categoria_passageiro === 'crianca' ? 'child' :
                             passagem.categoria_passageiro === 'idoso' ? 'senior' :
                             passagem.categoria_passageiro === 'pcd' ? 'disabled' :
                             passagem.categoria_passageiro === 'estudante' ? 'student' : 'adult',
          boarding_time: parseTimeString(viagem.horario_saida || ''),
          qr_code: passagem.codigo_qr,
          price: parseFloat(passagem.preco_pago) || 0,
          status: passagem.usado_em ? 'used' : 
                  passagem.cancelado_em ? 'cancelled' : 'active',
          created_at: passagem.comprado_em,
          used_at: passagem.usado_em,
          cancelled_at: passagem.cancelado_em,
          grupo_id: passagem.grupo_id || null,
          // Dados da viagem relacionada
          trips: {
            id: viagem.id || '',
            origin: rota.origem || '',
            destination: rota.destino || '',
            departure_time: departureTime,
            arrival_time: calculateArrivalTime(departureTime, 90),
            boarding_time: departureTime,
            date: viagem.data_viagem || '',
            ferry_name: embarcacao.nome || '',
            company: '',
            available_seats: 0,
            total_seats: 0,
            price_passenger: parseFloat(passagem.preco_pago) || 0,
            status: viagem.status === 'agendada' ? 'scheduled' :
                    viagem.status === 'embarcando' ? 'boarding' :
                    viagem.status === 'partiu' ? 'active' :
                    viagem.status === 'chegou' ? 'completed' :
                    viagem.status === 'cancelada' ? 'cancelled' : 'scheduled',
            gate: 'Portão 1',
            duration_minutes: 90,
            created_at: passagem.comprado_em,
          }
        };
      });

      set({ tickets: mappedTickets });
    } catch (error: any) {
      console.error('Erro ao buscar tickets:', error);
      set({ 
        error: 'Não foi possível carregar suas passagens. Tente novamente.',
        tickets: [],
      });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Atualiza o filtro de visualização
   */
  setFilter: (filter: TicketFilter) => {
    set({ filter });
  },

  /**
   * Busca um ticket específico pelo ID
   */
  getTicketById: (id: string) => {
    return get().tickets.find(ticket => ticket.id === id);
  },

  /**
   * Recarrega os tickets do usuário
   */
  refreshTickets: async (userId: string) => {
    await get().fetchTickets(userId);
  },

  /**
   * Retorna tickets filtrados baseado no filtro atual
   */
  getFilteredTickets: () => {
    const { tickets, filter } = get();

    if (filter === 'all') {
      return tickets;
    }

    return tickets.filter(ticket => ticket.status === filter);
  },
}));

