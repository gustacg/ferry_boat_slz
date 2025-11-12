import { useAuthStore } from '@/stores/authStore';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

/**
 * Hook para proteger páginas que requerem autenticação
 * 
 * Uso em qualquer página:
 * ```tsx
 * export default function MinhasPagina() {
 *   useRequireAuth();
 *   // ... resto do código
 * }
 * ```
 * 
 * @param redirectTo - Rota para redirecionar se não autenticado (padrão: '/login')
 */
export function useRequireAuth(redirectTo: string = '/login') {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Aguarda carregar
    if (isLoading) return;

    // Se não autenticado e não está na tela de login/signup
    if (!isAuthenticated && !segments.includes('login') && !segments.includes('signup')) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, segments]);

  return { isAuthenticated, isLoading };
}

/**
 * Hook para proteger ações (não redireciona, apenas retorna status)
 * 
 * Uso:
 * ```tsx
 * const { requireAuth } = useAuthProtection();
 * 
 * function handleComprar() {
 *   if (!requireAuth()) return; // Mostra modal de login
 *   // ... continua com a compra
 * }
 * ```
 */
export function useAuthProtection() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const requireAuth = (message?: string): boolean => {
    if (!isAuthenticated) {
      // Aqui podemos mostrar um modal ou redirecionar
      router.push('/login');
      return false;
    }
    return true;
  };

  return { requireAuth, isAuthenticated };
}

