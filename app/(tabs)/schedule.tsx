// app/(tabs)/schedule.tsx
import { useTripsStore } from '@/stores/tripsStore';
import { MaterialIcons } from '@expo/vector-icons';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SchedulePage() {
  const { trips, fetchTrips, isLoading, error, selectedDate, setSelectedDate } = useTripsStore();
  const [refreshing, setRefreshing] = useState(false);

  // Carrega viagens quando o componente monta
  useEffect(() => {
    fetchTrips();
  }, []);

  // Gera datas para o seletor (hoje + 4 dias)
  const dates = Array.from({ length: 5 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      label: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : format(date, 'dd/MM', { locale: ptBR }),
      value: format(date, 'yyyy-MM-dd'),
      date: date,
    };
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTrips();
    setRefreshing(false);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Horários</Text>
        <Text style={styles.headerSubtitle}>
          ({format(selectedDate, 'dd/MM', { locale: ptBR })})
        </Text>
      </View>

      {/* Date Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.dateSelector}
        contentContainerStyle={styles.dateSelectorContent}
      >
        {dates.map((date) => (
          <TouchableOpacity
            key={date.value}
            style={[
              styles.dateButton,
              date.value === format(selectedDate, 'yyyy-MM-dd') && styles.dateButtonActive
            ]}
            onPress={() => handleDateSelect(date.date)}
          >
            <Text
              style={[
                styles.dateButtonText,
                date.value === format(selectedDate, 'yyyy-MM-dd') && styles.dateButtonTextActive
              ]}
            >
              {date.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Trips List */}
      <ScrollView 
        style={styles.tripsList}
        contentContainerStyle={styles.tripsListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0066CC']} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Carregando horários...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="outlined" onPress={() => fetchTrips()} style={styles.retryButton}>
              Tentar novamente
            </Button>
          </View>
        ) : trips.filter(t => t.date === format(selectedDate, 'yyyy-MM-dd')).length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="event-busy" size={48} color="#CCCCCC" />
            <Text style={styles.emptyText}>Nenhuma viagem disponível para esta data</Text>
          </View>
        ) : (
          trips
            .filter(t => t.date === format(selectedDate, 'yyyy-MM-dd'))
            .map((trip) => (
          <TouchableOpacity 
            key={trip.id} 
            activeOpacity={0.7}
            onPress={() => router.push({
              pathname: '/(tabs)/trip-details',
              params: { tripId: trip.id }
            })}
          >
            <View 
              style={[
                styles.tripCard,
                { borderLeftColor: getStatusColor(trip.status) }
              ]}
            >
              {/* Trip Header */}
              <View style={styles.tripHeader}>
                <View style={styles.tripTimeContainer}>
                  <Text style={styles.tripTime}>{trip.departure_time}</Text>
                  <Text style={styles.tripRoute}>{trip.origin} → {trip.destination}</Text>
                </View>
                
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
              </View>

              {/* Trip Info */}
              <View style={styles.tripInfo}>
                <View>
                  <Text style={styles.availabilityLabel}>Vagas disponíveis</Text>
                  
                  {trip.status === 'full' ? (
                    <Text style={styles.availabilityValue}>Lotado</Text>
                  ) : (
                    <Text style={styles.availabilityValue}>
                      {trip.available_seats} vagas
                    </Text>
                  )}

                  {trip.available_seats < 20 && trip.status !== 'full' && (
                    <View style={styles.warningContainer}>
                      <MaterialIcons name="warning" size={16} color="#FFC107" />
                      <Text style={styles.warningText}>Poucas vagas restantes</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.buyButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push({
                      pathname: '/(tabs)/trip-details',
                      params: { tripId: trip.id }
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.buyButtonText}>Comprar</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginRight: 8,
  },
  headerSubtitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#666666',
  },
  dateSelector: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    maxHeight: 60,
  },
  dateSelectorContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066CC',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    minWidth: 70,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateButtonActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
  },
  dateButtonTextActive: {
    color: '#FFFFFF',
  },
  tripsList: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  tripsListContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripTimeContainer: {
    flex: 1,
  },
  tripTime: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  tripRoute: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  availabilityLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666666',
    marginBottom: 4,
  },
  availabilityValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0066CC',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFC107',
  },
  buyButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    borderColor: '#0066CC',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 12,
    textAlign: 'center',
  },
});