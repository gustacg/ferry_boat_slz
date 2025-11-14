// Caminho do arquivo: app/(tabs)/queue.tsx
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import { useQueueStore } from '@/stores/queueStore';
import { useTicketsStore } from '@/stores/ticketsStore';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QueuePage() {
  const { ticketId } = useLocalSearchParams<{ ticketId?: string }>();
  const { user } = useAuthStore();
  const { queueData, totalInQueue, isLoading, loadQueuePosition, loadQueueByTicket, refresh } = useQueueStore();
  const { tickets, fetchTickets } = useTicketsStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [checkingTickets, setCheckingTickets] = React.useState(true);

  // Primeiro: carregar tickets do usuário
  useEffect(() => {
    if (user?.id) {
      fetchTickets(user.id).finally(() => setCheckingTickets(false));
    }
  }, [user?.id]);

  // Segundo: verificar se precisa redirecionar para seleção
  useEffect(() => {
    if (!checkingTickets && user?.id && tickets.length > 0) {
      // Busca tickets ativos com viagens futuras
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const today = new Date().toISOString().split('T')[0];

      const activeTickets = tickets.filter((t) => {
        if (t.status !== 'active' || !t.trips) return false;
        const tripDate = t.trips.date;
        const tripStatus = t.trips.status;
        
        if (tripStatus !== 'scheduled' && tripStatus !== 'boarding') return false;
        if (tripDate < today) return false;
        
        if (tripDate === today) {
          try {
            const tripTimeStr = t.trips.departure_time;
            if (!tripTimeStr || tripTimeStr === '--:--') return true;
            const [hours, minutes] = tripTimeStr.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) return true;
            const tripMinutes = hours * 60 + minutes;
            return tripMinutes > (currentTime - 5);
          } catch {
            return true;
          }
        }
        return true;
      });

      // Se tiver múltiplas passagens, redireciona para seleção
      if (activeTickets.length > 1) {
        router.replace('/(tabs)/queue-select');
        return;
      }
    }
  }, [checkingTickets, tickets, user?.id]);

  // Terceiro: auto-atualização da fila a cada 25 segundos
  useEffect(() => {
    if (user?.id && !checkingTickets) {
      // Se tiver ticketId, carrega fila específica, senão carrega a primeira do usuário
      if (ticketId) {
        loadQueueByTicket(ticketId);
      } else {
        loadQueuePosition(user.id);
      }

      const interval = setInterval(() => {
        if (ticketId) {
          loadQueueByTicket(ticketId);
        } else {
          loadQueuePosition(user.id);
        }
      }, 25000); // 25 segundos

      return () => clearInterval(interval);
    }
  }, [user?.id, checkingTickets, ticketId]);

  const onRefresh = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await refresh(user.id, ticketId);
    setRefreshing(false);
  };

  // Calcula tempo estimado (aproximadamente 2 minutos por pessoa)
  const calculateEstimatedTime = (position: number): number => {
    return Math.max(position * 2, 5); // Mínimo 5 minutos
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const formatTime = (timeStr: string) => {
    // Remove segundos do horário (ex: "14:30:00" -> "14:30")
    if (timeStr && timeStr.includes(':')) {
      const parts = timeStr.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  if (isLoading || checkingTickets) {
    return <LoadingSpinner fullScreen message="Carregando fila..." />;
  }

  // Se não está autenticado, redireciona para login
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Fila ao vivo</Text>
          <Text style={styles.headerSubtitle}>Faça login para acessar</Text>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="login" size={64} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>Login necessário</Text>
          <Text style={styles.emptySubtitle}>
            Faça login para acompanhar sua posição na fila
          </Text>
          <Button 
            mode="contained" 
            style={styles.emptyButton}
            buttonColor="#0066CC"
            textColor="#FFFFFF"
            onPress={() => router.push('/login')}
          >
            Fazer Login
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!queueData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Fila ao vivo</Text>
          <Text style={styles.headerSubtitle}>Acompanhe sua posição</Text>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="people-outline" size={64} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>Você não está na fila</Text>
          <Text style={styles.emptySubtitle}>
            Compre uma passagem para uma viagem em embarque e você será automaticamente adicionado à fila
          </Text>
          <Button 
            mode="contained" 
            style={styles.emptyButton}
            buttonColor="#0066CC"
            textColor="#FFFFFF"
            onPress={() => router.push('/(tabs)/schedule')}
          >
            Ver Horários
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const estimatedTime = calculateEstimatedTime(queueData.posicao);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fila ao vivo</Text>
        <Text style={styles.headerSubtitle}>Atualização automática a cada 25s</Text>
      </View>
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0066CC']} />
        }
      >
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Sua posição na fila</Text>
            {/* --- Componente de Círculo de Progresso --- */}
            <View style={styles.progressCircleContainer}>
              <View style={styles.progressCircle}>
                <Text style={styles.progressText}>{queueData.posicao}°</Text>
                <Text style={styles.progressLabel}>posição</Text>
              </View>
            </View>
            {/* --- Fim do Componente --- */}
            <View style={styles.infoRow}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Total na fila</Text>
                <Text style={styles.infoValue}>{totalInQueue} pessoas</Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Tempo estimado</Text>
                <Text style={styles.infoValue}>~{estimatedTime} min</Text>
              </View>
            </View>
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <Button 
              mode="contained" 
              style={styles.qrButton} 
              labelStyle={styles.buttonLabel} 
              buttonColor="#0066CC"
              textColor="#FFFFFF"
              icon="qrcode"
              onPress={() => router.push({
                pathname: '/trip-qrcode',
                params: { ticketId: queueData.passagem_id }
              })}
            >
              Ver QR Code
            </Button>
            <Button 
              mode="outlined" 
              style={styles.button} 
              labelStyle={styles.buttonLabel} 
              textColor="#0066CC"
              onPress={onRefresh}
              loading={refreshing}
            >
              Atualizar posição
            </Button>
          </Card.Actions>
        </Card>

        <Text style={styles.sectionTitle}>Informações da viagem</Text>
        <View style={[styles.tripInfoCard, { borderLeftColor: '#0066CC' }]}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeTitle}>{queueData.origem} → {queueData.destino}</Text>
            <Text style={styles.dateTimeText}>
              {formatDate(queueData.data_viagem)} às {formatTime(queueData.horario_saida)}
            </Text>
          </View>

          <View style={styles.boardingRow}>
            <Text style={styles.boardingLabel}>Embarcação</Text>
            <Text style={styles.boardingValue}>{queueData.embarcacao_nome}</Text>
          </View>

          <View style={styles.boardingRow}>
            <Text style={styles.boardingLabel}>Operadora</Text>
            <Text style={styles.boardingValue}>
              {queueData.operadora === 'internacional_maritima' ? 'Internacional Marítima' :
               queueData.operadora === 'henvil' ? 'Henvil' :
               queueData.operadora === 'servi_porto' ? 'Servi Porto' : queueData.operadora}
            </Text>
          </View>

          <View style={styles.boardingRow}>
            <Text style={styles.boardingLabel}>Vagas para Passageiros</Text>
            <Text style={styles.boardingValue}>{queueData.vagas_disponiveis} disponíveis</Text>
          </View>

          <View style={[styles.boardingRow, styles.lastItem]}>
            <Text style={styles.boardingLabel}>Vagas para Veículos</Text>
            <Text style={styles.boardingValue}>
              {queueData.capacidade_max_veiculos - queueData.veiculos_atuais} disponíveis
            </Text>
          </View>
        </View>
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
    paddingVertical: 16,
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
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  cardTitle: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  progressCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  progressCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 10,
    borderColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  progressText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  progressLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingVertical: 16,
  },
  infoBlock: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  cardActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'column',
  },
  qrButton: {
    width: '100%',
    marginVertical: 8,
    backgroundColor: '#0066CC',
  },
  button: {
    width: '100%',
    marginVertical: 8,
    borderColor: '#0066CC',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tripInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0066CC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F4FD',
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0066CC',
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  boardingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  boardingLabel: {
    fontSize: 14,
    color: '#666666',
  },
  boardingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  passengerText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#0066CC',
  },
});
