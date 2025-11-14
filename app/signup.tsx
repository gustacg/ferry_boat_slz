import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import { formatCPF, formatPhone, isValidCPF, isValidFullName, isValidPassword } from '@/utils/validators';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, isLoading } = useAuthStore();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    cpf: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleCPFChange = (text: string) => {
    const formatted = formatCPF(text);
    updateField('cpf', formatted);
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhone(text);
    updateField('phone', formatted);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Digite seu nome completo';
    } else if (!isValidFullName(formData.fullName)) {
      newErrors.fullName = 'Digite nome e sobrenome';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Digite seu email';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = 'Digite seu CPF';
    } else if (!isValidCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido';
    }

    if (!formData.password) {
      newErrors.password = 'Digite sua senha';
    } else if (!isValidPassword(formData.password)) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirme sua senha';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    const { error, session } = await signUp(
      formData.email.trim(),
      formData.password,
      formData.fullName.trim(),
      formData.cpf.trim(),
      formData.phone.trim() || undefined
    );

    if (error) {
      if (error.message.includes('CPF já cadastrado')) {
        Alert.alert('Erro', 'Este CPF já está cadastrado. Faça login.');
      } else if (error.message.includes('password')) {
        Alert.alert('Erro', 'A senha deve ter no mínimo 6 caracteres.');
      } else {
        Alert.alert('Erro', error.message || 'Não foi possível criar sua conta. Tente novamente.');
      }
      return;
    }

    // Se a sessão foi criada (login automático), vai direto para home
    if (session) {
      router.replace('/(tabs)');
    } else {
      // Caso contrário, mostra sucesso
      Alert.alert(
        'Conta Criada!',
        'Sua conta foi criada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Criando sua conta..." />;
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
            <Text style={styles.title}>Criar Conta</Text>
            <Text style={styles.subtitle}>Junte-se a nós e viaje com facilidade</Text>
          </View>

          {/* Formulário */}
          <View style={styles.formContainer}>
            <TextInput
              label="Nome Completo"
              value={formData.fullName}
              onChangeText={(text) => updateField('fullName', text)}
              mode="outlined"
              autoCapitalize="words"
              left={<TextInput.Icon icon="account-outline" />}
              error={!!errors.fullName}
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#0066CC"
              textColor="#000000"
              theme={{ colors: { onSurfaceVariant: '#000000' } }}
            />
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

            <TextInput
              label="Email"
              value={formData.email}
              onChangeText={(text) => updateField('email', text)}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email-outline" />}
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
              label="CPF"
              value={formData.cpf}
              onChangeText={handleCPFChange}
              mode="outlined"
              keyboardType="numeric"
              maxLength={14}
              left={<TextInput.Icon icon="card-account-details-outline" />}
              error={!!errors.cpf}
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#0066CC"
              placeholder="000.000.000-00"
              textColor="#000000"
              theme={{ colors: { onSurfaceVariant: '#000000' } }}
            />
            {errors.cpf && <Text style={styles.errorText}>{errors.cpf}</Text>}

            <TextInput
              label="Telefone (opcional)"
              value={formData.phone}
              onChangeText={handlePhoneChange}
              mode="outlined"
              keyboardType="phone-pad"
              maxLength={15}
              left={<TextInput.Icon icon="phone-outline" />}
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#0066CC"
              placeholder="(00) 00000-0000"
              textColor="#000000"
              theme={{ colors: { onSurfaceVariant: '#000000' } }}
            />

            <TextInput
              label="Senha"
              value={formData.password}
              onChangeText={(text) => updateField('password', text)}
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
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

            <TextInput
              label="Confirmar Senha"
              value={formData.confirmPassword}
              onChangeText={(text) => updateField('confirmPassword', text)}
              mode="outlined"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              left={<TextInput.Icon icon="lock-check-outline" />}
              right={
                <TextInput.Icon 
                  icon={showConfirmPassword ? "eye-off" : "eye"} 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
              error={!!errors.confirmPassword}
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#0066CC"
              textColor="#000000"
              theme={{ colors: { onSurfaceVariant: '#000000' } }}
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

            {/* Botão Criar Conta */}
            <Button
              mode="contained"
              onPress={handleSignUp}
              style={styles.signupButton}
              labelStyle={styles.signupButtonLabel}
              loading={isLoading}
              disabled={isLoading}
            >
              Criar Conta
            </Button>

            {/* Link para Login */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Já tem uma conta? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>Entrar</Text>
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
    paddingVertical: 32,
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
  signupButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 8,
    marginTop: 24,
    borderRadius: 12,
  },
  signupButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#FFFFFF',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    color: '#666666',
  },
  loginLink: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '600',
  },
});

