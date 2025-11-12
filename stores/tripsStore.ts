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
      const dateStr = format(searchDate, 'yyyy-MM-dd');

      // Busca viagens na view viagens_disponiveis (já filtra viagens com vagas)
      const { data: viagensData, error: viagemError } = await supabase
        .from('viagens_disponiveis')
        .select('*')
        .eq('data_viagem', dateStr)
        .order('horario_saida', { ascending: true });

      if (viagemError) throw viagemError;

      // Mapeia dados da view para o formato esperado pelo app
      const mappedTrips: Trip[] = (viagensData || []).map((viagem: any) => ({
        id: viagem.id,
        origin: viagem.origem,
        destination: viagem.destino,
        departure_time: parseTimeString(viagem.horario_saida),
        arrival_time: parseTimeString(viagem.horario_saida), // Calculado depois se necessário
        boarding_time: parseTimeString(viagem.horario_saida),
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
        duration_minutes: 45,
        created_at: new Date().toISOString(),
      }));

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

