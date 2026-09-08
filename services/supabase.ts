import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Credenciais do Supabase, lidas do ambiente.
// Copie .env.example para .env e preencha antes de rodar o app.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Faltam EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY. Veja .env.example.'
  );
}

// Configuração do cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Usa AsyncStorage para salvar a sessão do usuário no celular
    storage: AsyncStorage,
    // Detecta automaticamente quando o usuário fecha/abre o app
    autoRefreshToken: true,
    // Mantém o usuário logado
    persistSession: true,
    // Detecta mudanças de sessão automaticamente
    detectSessionInUrl: false,
  },
});

