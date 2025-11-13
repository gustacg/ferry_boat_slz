// Caminho do arquivo: app/(tabs)/queue-select.tsx
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import { useTicketsStore } from '@/stores/ticketsStore';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QueueSelectPage() {
  const { user } = useAuthStore();
  const { tickets, fetchTickets, isLoading } = useTicketsStore();

  useEffect(() => {
    if (user?.id) {
      fetchTickets(user.id);
    }
  }, [user?.id]);

  // Filtra apenas passagens ativas com viagens embarcando ou agendadas
  const activeTicketsWithTrips = tickets.filter(
    (ticket) =>
      ticket.status === 'active' &&
      ticket.trips &&
      (ticket.trips.status === 'boarding' || ticket.trips.status === 'scheduled')
  );

  // Formata data brasileira
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const formatTime = (timeStr: string) => {
    if (timeStr && timeStr.includes(':')) {
      const parts = timeStr.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Carregando passagens..." />;
  }

  if (activeTicketsWithTrips.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Selecionar Fila</Text>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="receipt-long" size={64} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>Nenhuma viagem disponível</Text>
          <Text style={styles.emptySubtitle}>
            Você não possui passagens ativas para viagens que estão embarcando.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/(tabs)/schedule')}
          >
            <Text style={styles.emptyButtonText}>Ver Horários</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Se tiver apenas uma passagem, redireciona direto para a fila
  if (activeTicketsWithTrips.length === 1) {
    router.replace('/(tabs)/queue');
    return <LoadingSpinner fullScreen message="Carregando fila..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Selecionar Fila</Text>
        <Text style={styles.headerSubtitle}>
          Você tem {activeTicketsWithTrips.length} viagens disponíveis
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Escolha a viagem:</Text>

        {activeTicketsWithTrips.map((ticket) => (
          <TouchableOpacity
            key={ticket.id}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/queue',
                params: { ticketId: ticket.id },
              })
            }
          >
            <Card style={styles.tripCard}>
              <Card.Content>
                <View style={styles.routeHeader}>
                  <Text style={styles.routeTitle}>
                    {ticket.trips?.origin} → {ticket.trips?.destination}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          ticket.trips?.status === 'boarding' ? '#4CAF50' : '#0066CC',
                      },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {ticket.trips?.status === 'boarding' ? 'Embarcando' : 'Programada'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <MaterialIcons name="event" size={20} color="#666666" />
                  <Text style={styles.infoText}>
                    {formatDate(ticket.trips?.date || '')} às{' '}
                    {formatTime(ticket.trips?.departure_time || '')}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <MaterialIcons name="directions-boat" size={20} color="#666666" />
                  <Text style={styles.infoText}>{ticket.trips?.ferry_name}</Text>
                </View>

                <View style={styles.infoRow}>
                  <MaterialIcons name="confirmation-number" size={20} color="#666666" />
                  <Text style={styles.infoText}>{ticket.ticket_code}</Text>
                </View>

                <View style={styles.arrowContainer}>
                  <MaterialIcons name="arrow-forward" size={24} color="#0066CC" />
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
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
    marginTop: 4,
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
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F4FD',
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0066CC',
    flex: 1,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666666',
  },
  arrowContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});



