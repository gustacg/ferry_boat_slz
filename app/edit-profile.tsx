// Caminho do arquivo: app/edit-profile.tsx
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import { formatCPF as formatCPFUtil, formatPhone as formatPhoneUtil, isValidCPF } from '@/utils/validators';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditProfilePage() {
  const { profile, updateProfile, loadProfile, isAuthenticated } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');

  // Carrega perfil na montagem do componente
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated) {
        router.replace('/login');
        return;
      }
      
      // Força carregamento do perfil se não existir
      if (!profile) {
        await loadProfile();
      }
    };
    
    loadData();
  }, [isAuthenticated]);

  // Preenche campos quando perfil estiver disponível
  useEffect(() => {
    if (profile) {
      setNome(profile.nome_completo || '');
      setTelefone(profile.telefone ? formatPhoneUtil(profile.telefone) : '');
      setCpf(profile.cpf ? formatCPFUtil(profile.cpf) : '');
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [profile, isInitialLoad]);

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const formatCPF = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    return cleaned
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  const handleSave = async () => {
    // Validação
    if (!nome.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome completo');
      return;
    }

    if (!cpf.trim() || !isValidCPF(cpf)) {
      Alert.alert('Erro', 'CPF inválido');
      return;
    }

    if (telefone.trim() && telefone.replace(/\D/g, '').length < 10) {
      Alert.alert('Erro', 'Telefone inválido');
      return;
    }

    setIsLoading(true);

    try {
      const updates = {
        nome_completo: nome.trim(),
        telefone: telefone.replace(/\D/g, ''),
        cpf: cpf.replace(/\D/g, ''),
      };

      const { error } = await updateProfile(updates);

      if (error) {
        throw error;
      }

      await loadProfile();

      Alert.alert(
        'Sucesso',
        'Perfil atualizado com sucesso!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      Alert.alert('Erro', error.message || 'Não foi possível atualizar o perfil');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <LoadingSpinner fullScreen message="Redirecionando..." />;
  }

  // Aguarda o perfil ser carregado antes de renderizar o formulário
  if (isInitialLoad || !profile) {
    return <LoadingSpinner fullScreen message="Carregando perfil..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} style={styles.avatar as any} alt="Avatar" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {nome
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.avatarHint}>Foto de perfil</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label="Nome Completo *"
              value={nome}
              onChangeText={setNome}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#0066CC"
              left={<TextInput.Icon icon="account" />}
            />

            <TextInput
              label="CPF *"
              value={cpf}
              onChangeText={(text) => setCpf(formatCPF(text))}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#0066CC"
              keyboardType="numeric"
              maxLength={14}
              left={<TextInput.Icon icon="card-account-details" />}
            />

            <TextInput
              label="Telefone"
              value={telefone}
              onChangeText={(text) => setTelefone(formatPhone(text))}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#0066CC"
              keyboardType="phone-pad"
              maxLength={15}
              left={<TextInput.Icon icon="phone" />}
            />

            <View style={styles.infoBox}>
              <MaterialIcons name="info" size={20} color="#0066CC" />
              <Text style={styles.infoText}>
                Os campos marcados com * são obrigatórios
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            labelStyle={styles.saveButtonLabel}
            disabled={isLoading}
            loading={isLoading}
          >
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarHint: {
    fontSize: 14,
    color: '#666666',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF5FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#0066CC',
    flex: 1,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 8,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

