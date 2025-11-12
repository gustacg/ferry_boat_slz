import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Credenciais do Supabase
const SUPABASE_URL = 'https://ggerwnapzzflfkjnoien.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZXJ3bmFwenpmbGZram5vaWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTk1NDMsImV4cCI6MjA3ODM5NTU0M30.RFWx6kD4IOVWbg_7giBDAil4yWrATNk7fKwt1GguBi4';

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

