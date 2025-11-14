// Caminho do arquivo: app/operator/index.tsx
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TripData {
  id: string;
  data_viagem: string;
  horario_saida: string;
  status: string;
  origem: string;
  destino: string;
  embarcacao_nome: string;
  operadora: string;
  pedestres_atuais: number;
  capacidade_max_pedestres: number;
  veiculos_atuais: number;
  capacidade_max_veiculos: number;
  total_na_fila: number;
}

export default function OperatorHomePage() {
  const { user, role, isLoading: authLoading, signOut } = useAuthStore();
  const [trips, setTrips] = useState<TripData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user || (role !== 'operador' && role !== 'admin')) {
        Alert.alert('Acesso negado', 'Você não tem permissão para acessar esta área.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        loadTrips();
      }
    }
  }, [user, role, authLoading]);

  // Recarrega viagens quando a tela receber foco (após voltar de outra página)
  useFocusEffect(
    useCallback(() => {
      if (user && (role === 'operador' || role === 'admin')) {
        loadTrips();
      }
    }, [user, role])
  );

  const loadTrips = async () => {
    try {
      setIsLoading(true);

      // Busca viagens de hoje com status adequado para embarque
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('viagens')
        .select(`
          id,
          data_viagem,
          horario_saida,
          status,
          pedestres_atuais,
          capacidade_max_pedestres,
          veiculos_atuais,
          capacidade_max_veiculos,
          rotas!inner (
            origem,
            destino
          ),
          embarcacoes!inner (
            nome,
            operadora
          )
        `)
        .eq('data_viagem', today)
        .in('status', ['agendada', 'embarcando', 'atrasada'])
        .order('horario_saida', { ascending: true });

      if (error) throw error;

      // Conta quantos estão na fila para cada viagem
      const tripsWithQueue = await Promise.all(
        (data || []).map(async (viagem: any) => {
          const { count } = await supabase
            .from('fila_digital')
            .select('*', { count: 'exact', head: true })
            .eq('viagem_id', viagem.id)
            .eq('status', 'aguardando');

          return {
            id: viagem.id,
            data_viagem: viagem.data_viagem,
            horario_saida: viagem.horario_saida,
            status: viagem.status,
            origem: viagem.rotas.origem,
            destino: viagem.rotas.destino,
            embarcacao_nome: viagem.embarcacoes.nome,
            operadora: viagem.embarcacoes.operadora,
            pedestres_atuais: viagem.pedestres_atuais,
            capacidade_max_pedestres: viagem.capacidade_max_pedestres,
            veiculos_atuais: viagem.veiculos_atuais,
            capacidade_max_veiculos: viagem.capacidade_max_veiculos,
            total_na_fila: count || 0,
          };
        })
      );

      setTrips(tripsWithQueue);
    } catch (error: any) {
      console.error('Erro ao carregar viagens:', error);
      Alert.alert('Erro', 'Não foi possível carregar as viagens.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips();
  };

  const formatTime = (timeStr: string) => {
    if (timeStr && timeStr.includes(':')) {
      const parts = timeStr.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendada':
        return '#0066CC';
      case 'embarcando':
        return '#4CAF50';
      case 'atrasada':
        return '#FFC107';
      default:
        return '#666666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'agendada':
        return 'Agendada';
      case 'embarcando':
        return 'Embarcando';
      case 'atrasada':
        return 'Atrasada';
      default:
        return status;
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da conta?',
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

  if (authLoading || isLoading) {
    return <LoadingSpinner fullScreen message="Carregando..." />;
  }

  if (!user || (role !== 'operador' && role !== 'admin')) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <MaterialIcons name="badge" size={32} color="#FFFFFF" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Operador Embarcador</Text>
            <Text style={styles.headerSubtitle}>Controle de Embarque</Text>
          </View>
        </View>
        <IconButton
          icon="logout"
          iconColor="#FFFFFF"
          size={24}
          onPress={handleLogout}
          style={styles.logoutButton}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0066CC']} />}
      >
        <Text style={styles.sectionTitle}>Viagens de Hoje</Text>

        {trips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="event-busy" size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>Nenhuma viagem programada para hoje</Text>
          </View>
        ) : (
          trips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              activeOpacity={0.7}
              onPress={() => router.push({
                pathname: '/operator/boarding',
                params: { tripId: trip.id }
              } as any)}
            >
              <Card style={styles.tripCard}>
                <Card.Content>
                  <View style={styles.tripHeader}>
                    <Text style={styles.tripTime}>{formatTime(trip.horario_saida)}</Text>
                    <View
                      style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}
                    >
                      <Text style={styles.statusText}>{getStatusText(trip.status)}</Text>
                    </View>
                  </View>

                  <Text style={styles.tripRoute}>
                    {trip.origem} → {trip.destino}
                  </Text>

                  <View style={styles.tripInfo}>
                    <View style={styles.infoRow}>
                      <MaterialIcons name="directions-boat" size={18} color="#666666" />
                      <Text style={styles.infoText}>{trip.embarcacao_nome}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <MaterialIcons name="people" size={18} color="#666666" />
                      <Text style={styles.infoText}>
                        {trip.pedestres_atuais}/{trip.capacidade_max_pedestres}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <MaterialIcons name="directions-car" size={18} color="#666666" />
                      <Text style={styles.infoText}>
                        {trip.veiculos_atuais}/{trip.capacidade_max_veiculos}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <MaterialIcons name="queue" size={18} color="#666666" />
                      <Text style={styles.infoText}>{trip.total_na_fila} na fila</Text>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <MaterialIcons name="arrow-forward" size={24} color="#0066CC" />
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        )}
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
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoutButton: {
    margin: 0,
  },
  headerText: {
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripTime: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tripRoute: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 16,
  },
  tripInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  infoText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666666',
  },
  actionRow: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
    marginTop: 16,
  },
});

