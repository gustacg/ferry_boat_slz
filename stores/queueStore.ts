import { supabase } from '@/services/supabase';
import { create } from 'zustand';

// Interface para dados da fila
interface QueueData {
  id: string;
  posicao: number;
  horario_embarque_estimado: string | null;
  status: string;
  nome_passageiro: string;
  tipo_passagem: string;
  data_viagem: string;
  horario_saida: string;
  origem: string;
  destino: string;
  embarcacao_nome: string;
  operadora: string;
  vagas_disponiveis: number;
  capacidade_max_veiculos: number;
  veiculos_atuais: number;
  passagem_id: string;
}

interface QueueState {
  // Estado atual
  queueData: QueueData | null;
  totalInQueue: number;
  isLoading: boolean;
  error: string | null;

  // Ações
  loadQueuePosition: (userId: string) => Promise<void>;
  refresh: (userId: string) => Promise<void>;
  clear: () => void;
}

/**
 * Store de Fila Digital
 * 
 * Gerencia a posição do usuário na fila de embarque
 * e busca dados da tabela fila_digital
 */
export const useQueueStore = create<QueueState>((set, get) => ({
  // Estado inicial
  queueData: null,
  totalInQueue: 0,
  isLoading: false,
  error: null,

  /**
   * Carrega a posição do usuário na fila
   */
  loadQueuePosition: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Busca a posição na fila do usuário na view fila_tempo_real
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

      if (error && error.code !== 'PGRST116') { // Ignora erro de "não encontrado"
        throw error;
      }

      if (data) {
        // Transforma dados para estrutura esperada
        const queueData: QueueData = {
          id: data.id,
          posicao: data.posicao,
          horario_embarque_estimado: data.horario_embarque_estimado,
          status: data.status,
          nome_passageiro: data.passagens.nome_passageiro,
          tipo_passagem: data.passagens.tipo_passagem,
          data_viagem: data.passagens.viagens.data_viagem,
          horario_saida: data.passagens.viagens.horario_saida,
          origem: data.passagens.viagens.rotas.origem,
          destino: data.passagens.viagens.rotas.destino,
          embarcacao_nome: data.passagens.viagens.embarcacoes.nome,
          operadora: data.passagens.viagens.embarcacoes.operadora,
          vagas_disponiveis: data.passagens.viagens.capacidade_max_pedestres - data.passagens.viagens.pedestres_atuais,
          capacidade_max_veiculos: data.passagens.viagens.capacidade_max_veiculos,
          veiculos_atuais: data.passagens.viagens.veiculos_atuais,
          passagem_id: data.passagem_id,
        };

        // Busca total de pessoas na fila para a mesma viagem
        const { count } = await supabase
          .from('fila_digital')
          .select('*', { count: 'exact', head: true })
          .eq('viagem_id', data.viagem_id)
          .eq('status', 'aguardando');

        set({
          queueData,
          totalInQueue: count || 0,
          isLoading: false,
        });
      } else {
        // Usuário não está na fila
        set({
          queueData: null,
          totalInQueue: 0,
          isLoading: false,
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar fila:', error);
      set({
        error: error.message || 'Erro ao carregar fila',
        isLoading: false,
      });
    }
  },

  /**
   * Atualiza os dados da fila
   */
  refresh: async (userId: string) => {
    await get().loadQueuePosition(userId);
  },

  /**
   * Limpa os dados da fila
   */
  clear: () => {
    set({
      queueData: null,
      totalInQueue: 0,
      error: null,
    });
  },
}));

