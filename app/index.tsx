// Caminho do arquivo: app/index.tsx
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

/**
 * Página inicial do app
 * Redireciona o usuário para a tela apropriada baseado no seu role
 */
export default function IndexPage() {
  const { isAuthenticated, role, isLoading } = useAuthStore();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Aguarda o carregamento da autenticação antes de redirecionar
    if (!isLoading) {
      console.log('🏠 Index: Determinando redirecionamento. Auth:', isAuthenticated, 'Role:', role);
      setShouldRedirect(true);
    }
  }, [isLoading, isAuthenticated, role]);

  // Mostra loading enquanto verifica autenticação
  if (isLoading || !shouldRedirect) {
    return <LoadingSpinner fullScreen message="Carregando..." />;
  }

  // Se não está autenticado, vai para login
  if (!isAuthenticated) {
    console.log('🔄 Index: Redirecionando para login (não autenticado)');
    return <Redirect href="/login" />;
  }

  // Se é operador ou admin, vai para painel do operador
  if (role === 'operador' || role === 'admin') {
    console.log('🔄 Index: Redirecionando operador para painel');
    return <Redirect href="/operator" />;
  }

  // Caso contrário, vai para as tabs (usuário comum)
  console.log('🔄 Index: Redirecionando usuário comum para tabs');
  return <Redirect href="/(tabs)" />;
}

