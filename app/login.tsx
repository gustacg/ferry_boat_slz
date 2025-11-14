import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading, role, isAuthenticated } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Redireciona baseado no role após autenticação
  useEffect(() => {
    if (isAuthenticated && role) {
      console.log('🔄 Redirecionando usuário. Role:', role);
      
      if (role === 'operador' || role === 'admin') {
        console.log('👨‍✈️ Redirecionando para painel do operador...');
        router.replace('/operator');
      } else {
        console.log('👤 Redirecionando para painel do usuário...');
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, role]);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (errors.email) setErrors({ ...errors, email: undefined });
  };

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Digite seu email';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido';
    }

    if (!password) {
      newErrors.password = 'Digite sua senha';
    } else if (password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    const { error } = await signIn(email, password);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        Alert.alert('Erro', 'Email ou senha incorretos');
      } else {
        Alert.alert('Erro', error.message || 'Não foi possível fazer login. Tente novamente.');
      }
      return;
    }

    // O redirecionamento é feito automaticamente pelo useEffect baseado no role
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Entrando..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Logo e Título */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="boat" size={64} color="#0066CC" />
            </View>
            <Text style={styles.title}>Bem-vindo de volta!</Text>
            <Text style={styles.subtitle}>Entre para continuar sua jornada</Text>
          </View>

          {/* Formulário */}
          <View style={styles.formContainer}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={handleEmailChange}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email" />}
              error={!!errors.email}
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#0066CC"
              placeholder="seu@email.com"
              textColor="#000000"
              theme={{ colors: { onSurfaceVariant: '#000000' } }}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <TextInput
              label="Senha"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon 
                  icon={showPassword ? "eye-off" : "eye"} 
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              error={!!errors.password}
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#0066CC"
              textColor="#000000"
              theme={{ colors: { onSurfaceVariant: '#000000' } }}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            {/* Botão Entrar */}
            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.loginButton}
              labelStyle={styles.loginButtonLabel}
              loading={isLoading}
              disabled={isLoading}
            >
              Entrar
            </Button>

            {/* Link para Registro */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Ainda não tem conta? </Text>
              <TouchableOpacity onPress={() => router.push('/signup')}>
                <Text style={styles.signupLink}>Criar conta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0066CC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginBottom: 12,
    marginLeft: 4,
  },
  loginButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 8,
    marginTop: 24,
    borderRadius: 12,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#FFFFFF',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signupText: {
    fontSize: 14,
    color: '#666666',
  },
  signupLink: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '600',
  },
});

