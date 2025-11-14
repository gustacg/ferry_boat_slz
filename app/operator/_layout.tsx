import { Stack } from 'expo-router';

export default function OperatorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
          title: 'Painel do Operador' 
        }} 
      />
      <Stack.Screen 
        name="boarding" 
        options={{ 
          headerShown: false,
          title: 'Controle de Embarque' 
        }} 
      />
      <Stack.Screen 
        name="scanner" 
        options={{ 
          headerShown: false,
          title: 'Scanner QR Code' 
        }} 
      />
    </Stack>
  );
}

