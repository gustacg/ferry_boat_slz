import { supabase } from '@/services/supabase';
import { Trip } from '@/types';
import { parseTimeString } from '@/utils/dateUtils';
import { format } from 'date-fns';
import { create } from 'zustand';

interface TripsState {
  // Estado
  trips: Trip[];
  selectedDate: Date;
  isLoading: boolean;
  error: string | null;

  // Ações
  fetchTrips: (date?: Date) => Promise<void>;
  setSelectedDate: (date: Date) => void;
  refreshTrips: () => Promise<void>;
  getTripById: (id: string) => Trip | undefined;
}

/**
 * Store de Viagens
 * 
 * Gerencia todas as viagens disponíveis no sistema
 * 
 * Como usar:
 * ```tsx
 * import { useTripsStore } from '@/stores/tripsStore';
 * 
 * function ScheduleScreen() {
 *   const { trips, fetchTrips, isLoading } = useTripsStore();
 *   
 *   useEffect(() => {
 *     fetchTrips();
 *   }, []);
 *   
 *   if (isLoading) return <ActivityIndicator />;
 *   
 *   return (
 *     <FlatList
 *       data={trips}
 *       renderItem={({ item }) => <TripCard trip={item} />}
 *     />
 *   );
 * }
 * ```
 */
export const useTripsStore = create<TripsState>((set, get) => ({
  // Estado inicial
  trips: [],
  selectedDate: new Date(),
  isLoading: false,
  error: null,

  /**
   * Busca viagens do banco de dados
   * Pode filtrar por data específica
   * Busca apenas viagens com vagas disponíveis e datas futuras
   */
  fetchTrips: async (date?: Date) => {
    try {
      set({ isLoading: true, error: null });

      const searchDate = date || get().selectedDate;
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      // Busca viagens disponíveis (com vagas) na view
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = format(nextWeek, 'yyyy-MM-dd');
      
      const { data: viagensData, error: viagemError } = await supabase
        .from('viagens_disponiveis')
        .select('*')
        .gte('data_viagem', todayStr)
        .lte('data_viagem', nextWeekStr)
        .order('data_viagem', { ascending: true })
        .order('horario_saida', { ascending: true });

      if (viagemError) throw viagemError;

      // Busca também viagens canceladas (para mostrar o status aos usuários)
      const { data: viagensCanceladas, error: canceladasError } = await supabase
        .from('viagens')
        .select(`
          id,
          data_viagem,
          horario_saida,
          status,
          pedestres_atuais,
          capacidade_max_pedestres,
          rotas!inner (
            origem,
            destino
          ),
          embarcacoes!inner (
            nome,
            operadora
          ),
          horarios!inner (
            preco_pedestre,
            preco_veiculo
          )
        `)
        .eq('status', 'cancelada')
        .gte('data_viagem', todayStr)
        .lte('data_viagem', nextWeekStr)
        .order('data_viagem', { ascending: true })
        .order('horario_saida', { ascending: true });

      if (canceladasError) {
        console.error('Erro ao buscar viagens canceladas:', canceladasError);
      }

      // Combina viagens disponíveis e canceladas
      const todasViagens = [...(viagensData || [])];
      
      if (viagensCanceladas && viagensCanceladas.length > 0) {
        viagensCanceladas.forEach((viagem: any) => {
          todasViagens.push({
            ...viagem,
            vagas_disponiveis: 0,
            percentual_ocupacao: 100,
            embarcacao_nome: viagem.embarcacoes.nome,
            operadora: viagem.embarcacoes.operadora,
            origem: viagem.rotas.origem,
            destino: viagem.rotas.destino,
            preco_pedestre: viagem.horarios.preco_pedestre,
            preco_veiculo: viagem.horarios.preco_veiculo,
          });
        });
      }

      // Função auxiliar para calcular horário de chegada
      const calculateArrivalTime = (departureTime: string, durationMinutes: number = 90): string => {
        try {
          // Se departure_time está em formato HH:mm
          const [hours, minutes] = departureTime.split(':').map(Number);
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

      // Mapeia dados combinados para o formato esperado pelo app
      const mappedTrips: Trip[] = todasViagens.map((viagem: any) => {
        const departureTime = parseTimeString(viagem.horario_saida);
        const durationMinutes = 90; // 1h30 de viagem
        
        return {
          id: viagem.id,
          origin: viagem.origem,
          destination: viagem.destino,
          departure_time: departureTime,
          arrival_time: calculateArrivalTime(departureTime, durationMinutes),
          boarding_time: departureTime,
          date: format(new Date(viagem.data_viagem), 'yyyy-MM-dd'),
          ferry_name: viagem.embarcacao_nome,
          company: viagem.operadora,
          available_seats: viagem.vagas_disponiveis,
          total_seats: viagem.capacidade_max_pedestres,
          price: viagem.preco_pedestre,
          price_passenger: viagem.preco_pedestre,
          status: viagem.status === 'agendada' ? 'scheduled' : 
                  viagem.status === 'embarcando' ? 'boarding' : 
                  viagem.status === 'partiu' ? 'active' : 
                  viagem.status === 'chegou' ? 'completed' : 
                  viagem.status === 'cancelada' ? 'cancelled' : 'scheduled',
          gate: 'Portão 1',
          duration_minutes: durationMinutes,
          created_at: new Date().toISOString(),
        };
      });

      set({ trips: mappedTrips });
    } catch (error: any) {
      console.error('Erro ao buscar viagens:', error);
      set({ 
        error: 'Não foi possível carregar as viagens. Tente novamente.',
        trips: [],
      });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Atualiza a data selecionada e busca viagens dessa data
   */
  setSelectedDate: (date: Date) => {
    set({ selectedDate: date });
    get().fetchTrips(date);
  },

  /**
   * Recarrega as viagens da data atual
   */
  refreshTrips: async () => {
    await get().fetchTrips();
  },

  /**
   * Busca uma viagem específica pelo ID
   * Útil para detalhes da viagem
   */
  getTripById: (id: string) => {
    return get().trips.find(trip => trip.id === id);
  },
}));

