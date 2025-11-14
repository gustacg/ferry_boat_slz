import { supabase } from '@/services/supabase';
import { Perfil } from '@/types';
import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

// Interface que define o estado da autenticação
interface AuthState {
  // Estado atual
  user: User | null;
  profile: Perfil | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: 'usuario' | 'operador' | 'admin' | null;

  // Ações (funções que modificam o estado)
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, cpf: string, phone?: string) => Promise<{ error: any; session?: Session | null }>;
  signOut: () => Promise<void>;
  loadProfile: () => Promise<void>;
  loadRole: () => Promise<void>;
  updateProfile: (updates: Partial<Perfil>) => Promise<{ error: any }>;
  initialize: () => Promise<void>;
}

/**
 * Store de Autenticação
 * 
 * Gerencia tudo relacionado ao usuário logado:
 * - Login/Logout
 * - Registro
 * - Perfil do usuário
 * - Sessão ativa
 * 
 * Como usar em um componente:
 * ```tsx
 * import { useAuthStore } from '@/stores/authStore';
 * 
 * function MeuComponente() {
 *   const { user, signIn, signOut } = useAuthStore();
 *   
 *   return (
 *     <View>
 *       {user ? (
 *         <Text>Olá, {user.email}</Text>
 *       ) : (
 *         <Button onPress={() => signIn(email, password)}>Login</Button>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // Estado inicial
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  role: null,

  /**
   * Inicializa o store verificando se há sessão ativa
   * Deve ser chamado quando o app abre
   */
  initialize: async () => {
    try {
      set({ isLoading: true });

      // Verifica se há uma sessão salva
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        set({
          user: session.user,
          session: session,
          isAuthenticated: true,
        });

        // Carrega o perfil e role do usuário
        await get().loadProfile();
        await get().loadRole();
      }

      // Escuta mudanças na autenticação
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          set({
            user: session.user,
            session: session,
            isAuthenticated: true,
          });
          await get().loadProfile();
          await get().loadRole();
        } else {
          set({
            user: null,
            profile: null,
            session: null,
            isAuthenticated: false,
            role: null,
          });
        }
      });
    } catch (error) {
      console.error('Erro ao inicializar auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Faz login com email e senha
   */
  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true });

      // Faz login com email e senha
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // IMPORTANTE: Carrega role ANTES de marcar como autenticado
      // para garantir que o redirecionamento seja correto
      set({
        user: data.user,
        session: data.session,
      });

      // Carrega perfil e role de forma síncrona
      await get().loadProfile();
      await get().loadRole();

      // Só marca como autenticado depois de ter o role carregado
      set({ isAuthenticated: true });

      return { error: null };
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      return { error };
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Cria uma nova conta com email, senha, nome, CPF e telefone
   */
  signUp: async (email: string, password: string, fullName: string, cpf: string, phone?: string) => {
    try {
      set({ isLoading: true });

      // Remove formatação do CPF
      const cleanCPF = cpf.replace(/[^\d]/g, '');

      // Verifica se CPF já está cadastrado
      const { data: existingProfile } = await supabase
        .from('perfis')
        .select('id')
        .eq('cpf', cleanCPF)
        .single();

      if (existingProfile) {
        throw new Error('CPF já cadastrado. Faça login.');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            cpf: cleanCPF,
            telefone: phone || null,
          },
        },
      });

      if (error) throw error;

      // Se o email foi confirmado automaticamente (desenvolvimento),
      // faz login automático
      if (data.session && data.user) {
        set({
          user: data.user,
          session: data.session,
          isAuthenticated: true,
        });

        await get().loadProfile();
      }

      return { error: null, session: data.session };
    } catch (error: any) {
      console.error('Erro ao criar conta:', error);
      return { error };
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Faz logout
   */
  signOut: async () => {
    try {
      set({ isLoading: true });
      await supabase.auth.signOut();
      
      set({
        user: null,
        profile: null,
        session: null,
        isAuthenticated: false,
        role: null,
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Carrega o perfil completo do usuário com estatísticas calculadas
   */
  loadProfile: async () => {
    try {
      const user = get().user;
      if (!user) return;

      // Busca do perfil com estatísticas calculadas em tempo real
      const { data: profile } = await supabase
        .from('estatisticas_perfil')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        set({ profile });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  },

  /**
   * Carrega o papel (role) do usuário da tabela papeis_usuario
   */
  loadRole: async () => {
    try {
      const user = get().user;
      if (!user) {
        console.log('⚠️ loadRole: Nenhum usuário autenticado');
        return;
      }

      console.log('🔍 Buscando role do usuário:', user.id);

      // Busca o papel do usuário
      const { data, error } = await supabase
        .from('papeis_usuario')
        .select('papel')
        .eq('usuario_id', user.id)
        .single();

      if (error) {
        console.error('❌ Erro ao carregar role:', error);
        // Se não encontrar papel, assume usuário comum
        set({ role: 'usuario' });
        console.log('⚠️ Role padrão definido como: usuario');
        return;
      }

      if (data) {
        const userRole = data.papel as 'usuario' | 'operador' | 'admin';
        set({ role: userRole });
        console.log('✅ Role carregado com sucesso:', userRole);
      } else {
        // Se não encontrar papel, assume usuário comum
        set({ role: 'usuario' });
        console.log('⚠️ Nenhum role encontrado, definido como: usuario');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar role:', error);
      set({ role: 'usuario' });
    }
  },

  /**
   * Atualiza dados do perfil
   */
  updateProfile: async (updates: Partial<Perfil>) => {
    try {
      const user = get().user;
      if (!user) return { error: 'Usuário não autenticado' };

      const { data, error } = await supabase
        .from('perfis')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      set({ profile: data });
      return { error: null };
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      return { error };
    }
  },
}));

