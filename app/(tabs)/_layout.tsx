import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { ComponentProps, useEffect } from 'react';

// Componente auxiliar para o ícone da aba para evitar repetição
function TabBarIcon({ name, color }: { name: ComponentProps<typeof Ionicons>['name']; color: string }) {
  return <Ionicons size={24} name={name} color={color} />;
}

export default function TabLayout() {
  const router = useRouter();
  const { role, isAuthenticated, isLoading } = useAuthStore();

  // Redireciona operadores para o painel correto
  useEffect(() => {
    if (!isLoading && isAuthenticated && (role === 'operador' || role === 'admin')) {
      console.log('🔄 Operador detectado nas tabs, redirecionando para painel...');
      router.replace('/operator');
    }
  }, [role, isAuthenticated, isLoading]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0066CC',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        headerShown: false,
      }}
    >
      {/* Tela Inicial */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
          ),
        }}
      />

      {/* Tela de Horários */}
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Horários',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'time' : 'time-outline'} color={color} />
          ),
        }}
      />

      {/* Tela de Fila Digital - Seleção */}
      <Tabs.Screen
        name="queue-select"
        options={{
          title: 'Fila',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'people' : 'people-outline'} color={color} />
          ),
        }}
      />

      {/* Tela de Passagens */}
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Passagens',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'ticket' : 'ticket-outline'} color={color} />
          ),
        }}
      />

      {/* Tela de Perfil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'person' : 'person-outline'} color={color} />
          ),
        }}
      />

      {/* Páginas auxiliares - ocultas do menu inferior */}
      <Tabs.Screen
        name="queue"
        options={{
          href: null, // Remove do menu inferior - página de fila individual
        }}
      />
      <Tabs.Screen
        name="trip-details"
        options={{
          href: null, // Remove do menu inferior
        }}
      />
      <Tabs.Screen
        name="trip-qrcode"
        options={{
          href: null, // Remove do menu inferior
        }}
      />
      <Tabs.Screen
        name="faq"
        options={{
          href: null, // Remove do menu inferior
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null, // Remove do menu inferior - notificações push no futuro
        }}
      />
    </Tabs>
  );
}
