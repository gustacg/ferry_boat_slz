import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  color?: string;
}

/**
 * Componente de Loading Reutilizável
 * 
 * Uso:
 * ```tsx
 * <LoadingSpinner message="Carregando..." />
 * <LoadingSpinner fullScreen /> // Tela cheia
 * ```
 */
export default function LoadingSpinner({ 
  message = 'Carregando...', 
  fullScreen = false,
  color = '#0066CC'
}: LoadingSpinnerProps) {
  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.inlineContainer;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size="large" color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  inlineContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});

