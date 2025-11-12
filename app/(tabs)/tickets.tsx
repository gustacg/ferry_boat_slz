// Caminho do arquivo: app/(tabs)/tickets.tsx
import { useAuthStore } from '@/stores/authStore';
import { useTicketsStore } from '@/stores/ticketsStore';
import { TicketStatus } from '@/types';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TicketsPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();
  const { tickets, fetchTickets, isLoading, filter, setFilter } = useTicketsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TicketStatus>('active');

  // Carrega tickets quando o usuário está autenticado
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchTickets(user.id);
    }
  }, [isAuthenticated, user?.id]);

  const onRefresh = async () => {
    if (user?.id) {
      setRefreshing(true);
      await fetchTickets(user.id);
      setRefreshing(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => ticket.status === activeTab);

  // Se não estiver autenticado, mostra mensagem
  if (!authLoading && !isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Minhas Passagens</Text>
        </View>
        <View style={styles.notAuthContainer}>
          <MaterialIcons name="confirmation-number" size={64} color="#CCCCCC" />
          <Text style={styles.notAuthText}>Você precisa fazer login para ver suas passagens</Text>
          <Button 
            mode="contained" 
            onPress={() => router.push('/login')} 
            style={styles.loginButton}
          >
            Fazer Login
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const handleViewQRCode = (ticketId: string) => {
    router.push({
      pathname: '/trip-qrcode',
      params: { ticketId },
    });
  };

  const handleViewDetails = (ticketId: string) => {
    router.push({
      pathname: '/trip-details',
      params: { ticketId },
    });
  };

  const handleCancelTicket = (ticketId: string) => {
    Alert.alert(
      'Cancelar Passagem',
      'Tem certeza que deseja cancelar esta passagem? Esta ação não pode ser desfeita.',
      [
        {
          text: 'Não',
          style: 'cancel',
        },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await import('@/services/supabase').then(m => m.supabase
                .from('passagens')
                .update({
                  cancelado_em: new Date().toISOString(),
                  motivo_cancelamento: 'Cancelado pelo usuário',
                })
                .eq('id', ticketId)
              );

              if (error) throw error;

              Alert.alert('Sucesso', 'Passagem cancelada com sucesso');
              
              // Recarrega a lista
              if (user?.id) {
                fetchTickets(user.id);
              }
            } catch (error: any) {
              console.error('Erro ao cancelar passagem:', error);
              Alert.alert('Erro', 'Não foi possível cancelar a passagem. Tente novamente.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minhas Passagens</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Ativas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'used' && styles.tabActive]}
          onPress={() => setActiveTab('used')}
        >
          <Text style={[styles.tabText, activeTab === 'used' && styles.tabTextActive]}>
            Utilizadas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'cancelled' && styles.tabActive]}
          onPress={() => setActiveTab('cancelled')}
        >
          <Text style={[styles.tabText, activeTab === 'cancelled' && styles.tabTextActive]}>
            Canceladas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Passagens */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0066CC']} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Carregando passagens...</Text>
          </View>
        ) : filteredTickets.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="confirmation-number" size={64} color="#CCCCCC" />
            <Text style={styles.emptyStateText}>
              Nenhuma passagem {activeTab === 'active' ? 'ativa' : activeTab === 'used' ? 'utilizada' : 'cancelada'}
            </Text>
          </View>
        ) : (
          filteredTickets.map((ticket) => (
            <Card key={ticket.id} style={styles.ticketCard}>
              <Card.Content style={styles.cardContent}>
                {/* Código do Ticket */}
                <Text style={styles.ticketId}>{ticket.ticket_code}</Text>

                {/* Rota */}
                {ticket.trips && (
                  <View style={styles.routeContainer}>
                    <Text style={styles.routeText}>
                      {ticket.trips.origin} → {ticket.trips.destination}
                    </Text>
                  </View>
                )}

                {/* Data */}
                {ticket.trips && (
                  <Text style={styles.dateText}>
                    {format(new Date(ticket.trips.date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </Text>
                )}

                {/* Informações de Embarque e Valor */}
                <View style={styles.infoContainer}>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Embarque</Text>
                    <Text style={styles.infoValue}>{ticket.boarding_time}</Text>
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Valor</Text>
                    <Text style={styles.infoValue}>
                      R$ {ticket.price.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                </View>

                {/* Botões de Ação */}
                {ticket.status === 'active' && (
                  <>
                    <Button
                      mode="contained"
                      onPress={() => handleViewQRCode(ticket.id)}
                      style={styles.primaryButton}
                      labelStyle={styles.primaryButtonLabel}
                    >
                      Ver QR Code
                    </Button>
                    <Button
                      mode="text"
                      onPress={() => handleCancelTicket(ticket.id)}
                      style={styles.cancelButton}
                      labelStyle={styles.cancelButtonLabel}
                    >
                      Cancelar Passagem
                    </Button>
                  </>
                )}

                {ticket.status === 'cancelled' && (
                  <View style={styles.cancelledBadge}>
                    <MaterialIcons name="cancel" size={16} color="#F44336" />
                    <Text style={styles.cancelledText}>Cancelada</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#0066CC',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  tabTextActive: {
    color: '#0066CC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    padding: 16,
  },
  ticketId: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  routeContainer: {
    marginBottom: 8,
  },
  routeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  dateText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F8FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 24,
  },
  infoBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  primaryButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
  },
  primaryButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 4,
  },
  detailsButton: {
    borderRadius: 8,
    borderColor: '#0066CC',
    borderWidth: 1,
  },
  detailsButtonLabel: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 4,
  },
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  cancelledText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 8,
  },
  cancelButtonLabel: {
    color: '#F44336',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999999',
    marginTop: 16,
    textAlign: 'center',
  },
  notAuthContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  notAuthText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 32,
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
});