import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import LoadingSpinner from '@/components/LoadingSpinner';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/authStore';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { initialize, isLoading } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  // Inicializa autenticação ao abrir o app
  useEffect(() => {
    async function prepareApp() {
      try {
        await initialize();
      } catch (error) {
        console.error('Erro ao inicializar app:', error);
      } finally {
        setIsReady(true);
      }
    }

    prepareApp();
  }, []);

  // Mostra loading enquanto inicializa
  if (!isReady || isLoading) {
    return <LoadingSpinner fullScreen message="Carregando..." />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="trip-qrcode" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
