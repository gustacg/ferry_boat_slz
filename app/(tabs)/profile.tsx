// Caminho do arquivo: app/(tabs)/profile.tsx
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user, profile, loadProfile, signOut, isLoading } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    // Redireciona para login se não estiver autenticado
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    // Carrega perfil quando componente monta
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated]);

  // Função para formatar CPF
  const formatCPF = (cpf: string) => {
    if (!cpf) return '000.000.000-00';
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  // Função para formatar telefone
  const formatPhone = (phone: string) => {
    if (!phone) return '(00) 00000-0000';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  };

  // Dados do usuário (reais ou mockados)
  const userData = {
    name: profile?.nome_completo || user?.user_metadata?.full_name || 'Usuário',
    email: user?.email || 'email@exemplo.com',
    phone: formatPhone(profile?.telefone || ''),
    cpf: formatCPF(profile?.cpf || ''),
    tripsCount: profile?.total_viagens || 0,
    totalSpent: typeof profile?.total_gasto === 'number' ? profile.total_gasto.toFixed(2) : '0.00',
    avatar: profile?.avatar_url || null,
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Carregando perfil..." />;
  }

  if (!isAuthenticated) {
    return <LoadingSpinner fullScreen message="Redirecionando..." />;
  }

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const handleHelpCenter = () => {
    router.push('/faq');
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header com Avatar e Nome */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {userData.avatar ? (
              <Image source={{ uri: userData.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {userData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.userName}>{userData.name}</Text>
            <TouchableOpacity onPress={handleEditProfile}>
              <Text style={styles.editProfileText}>editar perfil</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Informações Pessoais */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações pessoais</Text>
          
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="email" size={24} color="#0066CC" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{userData.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="phone" size={24} color="#0066CC" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Telefone</Text>
                <Text style={styles.infoValue}>{userData.phone}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="badge" size={24} color="#0066CC" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>CPF</Text>
                <Text style={styles.infoValue}>{userData.cpf}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Estatísticas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estatísticas</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userData.tripsCount}</Text>
              <Text style={styles.statLabel}>Viagens realizadas</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statNumber, styles.statNumberGreen]}>
                R$ {userData.totalSpent}
              </Text>
              <Text style={styles.statLabel}>Total gasto</Text>
            </View>
          </View>
        </View>

        {/* Configurações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          
          <View style={styles.card}>
            <View style={styles.configRow}>
              <View style={styles.configLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="notifications" size={24} color="#0066CC" />
                </View>
                <Text style={styles.configLabel}>Notificações</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                color="#0066CC"
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.configRow} 
              onPress={handleHelpCenter}
              activeOpacity={0.7}
            >
              <View style={styles.configLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="help-circle" size={24} color="#0066CC" />
                </View>
                <Text style={styles.configLabel}>Central de ajuda</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#666666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Botão Sair da Conta */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>

        {/* Espaçamento inferior */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  headerTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  editProfileText: {
    fontSize: 14,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 8,
  },
  statNumberGreen: {
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  configLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  configLabel: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF5252',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF5252',
  },
  bottomSpacer: {
    height: 40,
  },
});