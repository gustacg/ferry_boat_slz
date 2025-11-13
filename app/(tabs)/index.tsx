// Caminho do arquivo: app/(tabs)/index.tsx
import { useAuthStore } from '@/stores/authStore';
import { useTicketsStore } from '@/stores/ticketsStore';
import { useTripsStore } from '@/stores/tripsStore';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, profile } = useAuthStore();
  const { trips, fetchTrips, isLoading: tripsLoading } = useTripsStore();
  const { tickets, fetchTickets, isLoading: ticketsLoading } = useTicketsStore();
  const [refreshing, setRefreshing] = React.useState(false);

  // Extrai o primeiro nome do usuário
  const getFirstName = () => {
    if (profile?.nome_completo) {
      return profile.nome_completo.split(' ')[0];
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0];
    }
    return 'Usuário';
  };

  // Retorna cor do status (igual à página de horários)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'boarding':
        return '#4CAF50';
      case 'full':
        return '#FFC107';
      case 'active':
        return '#0066CC';
      case 'completed':
        return '#666666';
      case 'cancelled':
        return '#F44336';
      default:
        return '#666666';
    }
  };

  // Retorna texto do status (igual à página de horários)
  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Programada';
      case 'boarding':
        return 'Embarcando';
      case 'active':
        return 'Em Rota';
      case 'full':
        return 'Lotada';
      case 'completed':
        return 'Finalizada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return 'Desconhecido';
    }
  };

  // Carrega dados quando o componente monta
  useEffect(() => {
    loadData();
  }, []);

  // Carrega tickets quando o usuário faz login
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchTickets(user.id);
    }
  }, [isAuthenticated, user?.id]);

  const loadData = async () => {
    // Busca viagens de hoje e dos próximos dias
    const today = new Date();
    await fetchTrips(today);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (isAuthenticated && user?.id) {
      await fetchTickets(user.id);
    }
    setRefreshing(false);
  };

  // Busca as passagens ativas do usuário com viagens futuras
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const today = format(now, 'yyyy-MM-dd');

  const activeTicketsWithFutureTrips = tickets.filter((t) => {
    if (t.status !== 'active' || !t.trips) return false;
    
    const tripDate = t.trips.date;
    const tripStatus = t.trips.status;
    
    // Só mostra viagens programadas ou embarcando
    if (tripStatus !== 'scheduled' && tripStatus !== 'boarding') return false;
    
    // Se a data da viagem for anterior a hoje, não mostra
    if (tripDate < today) return false;
    
    // Se for hoje, verifica se o horário já passou
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

  // Ordena por data e horário mais próximo
  const sortedActiveTickets = activeTicketsWithFutureTrips.sort((a, b) => {
    const dateA = new Date(`${a.trips?.date}T${a.trips?.departure_time}`);
    const dateB = new Date(`${b.trips?.date}T${b.trips?.departure_time}`);
    return dateA.getTime() - dateB.getTime();
  });

  // Pega a viagem mais próxima
  const activeTicket = sortedActiveTickets[0];
  
  // Busca próximas viagens que ainda não aconteceram
  
  const upcomingTrips = trips
    .filter(t => {
      // Filtra apenas viagens agendadas ou embarcando
      if (t.status !== 'scheduled' && t.status !== 'boarding') return false;
      
      // Se a data da viagem for anterior a hoje, não mostra
      if (t.date < today) return false;
      
      // Se for hoje, verifica se o horário já passou
      if (t.date === today) {
        try {
          // departure_time já vem como string do tipo "14:30" do store
          const tripTimeStr = t.departure_time;
          if (!tripTimeStr || tripTimeStr === '--:--') return true;
          
          // Extrai hora e minuto da string HH:mm
          const [hours, minutes] = tripTimeStr.split(':').map(Number);
          if (isNaN(hours) || isNaN(minutes)) return true; // Se não conseguir parsear, mostra
          
          const tripMinutes = hours * 60 + minutes;
          
          // Só mostra se ainda não passou (adiciona margem de 5 minutos)
          return tripMinutes > (currentTime - 5);
        } catch (error) {
          console.log('Erro ao filtrar horário:', error);
          return true; // Em caso de erro, mostra a viagem
        }
      }
      
      // Se for data futura, mostra
      return true;
    })
    .slice(0, 15);

  // Por enquanto, sem dados de fila - será implementado depois
  const queuePosition = null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0066CC']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Ionicons name="boat" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.welcomeText}>
                {isAuthenticated ? `Olá, ${getFirstName()}!` : 'Bem-vindo'}
              </Text>
              <Text style={styles.subtitleText}>Sistema Ferry Boat</Text>
            </View>
            {!isAuthenticated && (
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.push('/login')}
              >
                <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
                <Text style={styles.loginButtonText}>Entrar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Active Trip Card */}
        <View style={styles.content}>
          {activeTicket && activeTicket.trips ? (
            <>
              <View style={styles.activeTripHeader}>
                <Text style={styles.sectionTitle}>Sua viagem ativa</Text>
              </View>

              <Card style={styles.activeTripCard}>
                <Card.Content>
                  {/* Route */}
                  <View style={styles.routeContainer}>
                    <View style={styles.locationContainer}>
                      <Text style={styles.locationLabel}>Embarque</Text>
                      <Text style={styles.locationCity}>{activeTicket.trips.origin}</Text>
                      <Text style={styles.timeText}>{activeTicket.trips.departure_time}</Text>
                    </View>

                    <View style={styles.arrowContainer}>
                      <MaterialIcons name="arrow-forward" size={24} color="#0066CC" />
                    </View>

                    <View style={styles.locationContainer}>
                      <Text style={styles.locationLabel}>Chegada</Text>
                      <Text style={styles.locationCity}>{activeTicket.trips.destination}</Text>
                      <Text style={styles.timeText}>{activeTicket.trips.arrival_time}</Text>
                    </View>
                  </View>

                  {/* Ferry Info */}
                  <View style={styles.ferryInfoContainer}>
                    <View style={styles.ferryInfoRow}>
                      <Text style={styles.ferryInfoLabel}>Embarcação</Text>
                      <Text style={styles.ferryInfoValue}>{activeTicket.trips.ferry_name}</Text>
                    </View>
                    <View style={styles.ferryInfoRow}>
                      <Text style={styles.ferryInfoLabel}>Operadora</Text>
                      <Text style={styles.ferryInfoValue}>{activeTicket.trips.operator || 'Sistema Ferry'}</Text>
                    </View>
                  </View>

                  {/* Action Button */}
                  <Button
                    mode="contained"
                    style={styles.followTripButton}
                    labelStyle={styles.followTripButtonText}
                    buttonColor="#0066CC"
                    textColor="#FFFFFF"
                    onPress={() => {
                      // Se tiver múltiplas passagens ativas, vai para seleção
                      if (sortedActiveTickets.length > 1) {
                        router.push('/(tabs)/queue-select');
                      } else {
                        router.push('/(tabs)/queue');
                      }
                    }}
                  >
                    {sortedActiveTickets.length > 1 
                      ? `Ver filas (${sortedActiveTickets.length})` 
                      : 'Ver posição na fila'}
                  </Button>
                </Card.Content>
              </Card>
            </>
          ) : ticketsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066CC" />
              <Text style={styles.loadingText}>Carregando suas viagens...</Text>
            </View>
          ) : null}

          {/* Upcoming Trips */}
          <View style={styles.upcomingHeader}>
            <Text style={styles.sectionTitleSpaced}>Próximas saídas</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')}>
              <Text style={styles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {tripsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0066CC" />
              <Text style={styles.loadingText}>Carregando horários...</Text>
            </View>
          ) : upcomingTrips.length > 0 ? (
            upcomingTrips.map((trip) => (
              <TouchableOpacity 
                key={trip.id}
                onPress={() => router.push({
                  pathname: '/(tabs)/trip-details',
                  params: { tripId: trip.id }
                })}
                activeOpacity={0.7}
              >
                <Card style={styles.tripCard}>
                  <Card.Content style={styles.tripCardContent}>
                    <View style={styles.tripTimeContainer}>
                      <Text style={styles.tripTime}>{trip.departure_time}</Text>
                      <Text style={styles.tripRoute}>{trip.origin} → {trip.destination}</Text>
                    </View>

                    <View style={styles.tripStatusContainer}>
                      <View 
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(trip.status) + '20' }
                        ]}
                      >
                        <Text 
                          style={[
                            styles.statusText,
                            { color: getStatusColor(trip.status) }
                          ]}
                        >
                          {getStatusText(trip.status)}
                        </Text>
                      </View>
                      <Text style={styles.seatsText}>{trip.available_seats} vagas</Text>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialIcons name="event-busy" size={48} color="#CCCCCC" />
              <Text style={styles.emptyStateText}>Nenhuma viagem disponível no momento</Text>
            </View>
          )}
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
    paddingVertical: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  activeTripHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  activeTripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 2,
    marginBottom: 24,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  locationContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  locationCity: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0066CC',
  },
  arrowContainer: {
    paddingHorizontal: 16,
  },
  ferryInfoContainer: {
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  ferryInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ferryInfoLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  ferryInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  followTripButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    paddingVertical: 6,
  },
  followTripButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitleSpaced: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionIconHighlight: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  queueNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#666666',
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '600',
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  tripCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  tripTimeContainer: {
    flex: 1,
  },
  tripTime: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  tripRoute: {
    fontSize: 14,
    color: '#666666',
  },
  tripStatusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  seatsText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 12,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 12,
    textAlign: 'center',
  },
});