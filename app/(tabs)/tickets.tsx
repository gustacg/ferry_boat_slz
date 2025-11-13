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

  // Função para contar passagens no mesmo grupo
  const getGroupCount = (ticket: any) => {
    if (!ticket.grupo_id) return 1;
    return tickets.filter(t => t.grupo_id === ticket.grupo_id && t.status === ticket.status).length;
  };

  // Função para verificar se é a primeira passagem do grupo (para não duplicar cards de grupo)
  const isFirstInGroup = (ticket: any, index: number) => {
    if (!ticket.grupo_id) return true;
    const sameGroupBefore = filteredTickets.slice(0, index).find(t => t.grupo_id === ticket.grupo_id);
    return !sameGroupBefore;
  };

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
            buttonColor="#0066CC"
            textColor="#FFFFFF"
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

  const handleCancelTicket = async (ticketId: string) => {
    try {
      // Busca informações da passagem e viagem diretamente
      const { supabase } = await import('@/services/supabase');
      
      // Primeiro busca os dados da passagem
      const { data: passagem, error: fetchError } = await supabase
        .from('passagens')
        .select('grupo_id, nome_passageiro, viagem_id')
        .eq('id', ticketId)
        .single();

      if (fetchError) throw fetchError;

      // Agora busca os dados da viagem
      const { data: viagem, error: viagemError } = await supabase
        .from('viagens')
        .select('data_viagem, horario_saida')
        .eq('id', passagem.viagem_id)
        .single();

      if (viagemError) throw viagemError;

      // Verifica se faltam 2 horas ou menos para a partida
      if (viagem) {
        const dataViagem = viagem.data_viagem;
        const horarioSaida = viagem.horario_saida;
        
        // Combina data e hora da viagem
        const [year, month, day] = dataViagem.split('-');
        const [hour, minute] = horarioSaida.split(':');
        const dataHoraViagem = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute)
        );
        
        // Calcula diferença em horas
        const agora = new Date();
        const diferencaMs = dataHoraViagem.getTime() - agora.getTime();
        const diferencaHoras = diferencaMs / (1000 * 60 * 60);
        
        // Se faltar 3 horas ou menos, não permite cancelamento
        if (diferencaHoras <= 3 && diferencaHoras >= 0) {
          Alert.alert(
            'Cancelamento não permitido',
            'Não é possível cancelar passagens com menos de 3 horas antes da partida.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Se a viagem já passou, também não permite
        if (diferencaHoras < 0) {
          Alert.alert(
            'Cancelamento não permitido',
            'Não é possível cancelar passagens de viagens que já partiram.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Verifica se há outras passagens no mesmo grupo
      let totalNoGrupo = 1;
      if (passagem.grupo_id) {
        const { count } = await supabase
          .from('passagens')
          .select('id', { count: 'exact', head: true })
          .eq('grupo_id', passagem.grupo_id)
          .is('cancelado_em', null);
        totalNoGrupo = count || 1;
      }

      // Se há múltiplas passagens no grupo, oferece opção de cancelar todas
      if (totalNoGrupo > 1) {
        Alert.alert(
          'Cancelar Passagem',
          `Esta compra possui ${totalNoGrupo} passagens. O que deseja fazer?`,
          [
            {
              text: 'Voltar',
              style: 'cancel',
            },
            {
              text: 'Cancelar Apenas Esta',
              onPress: () => cancelarPassagens([ticketId]),
            },
            {
              text: 'Cancelar Todas do Grupo',
              style: 'destructive',
              onPress: () => cancelarPassagensPorGrupo(passagem.grupo_id!),
            },
          ]
        );
      } else {
        // Passagem única, cancela diretamente
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
              onPress: () => cancelarPassagens([ticketId]),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Erro ao buscar informações da passagem:', error);
      Alert.alert('Erro', 'Não foi possível processar o cancelamento. Tente novamente.');
    }
  };

  const cancelarPassagens = async (passagemIds: string[]) => {
    try {
      const { supabase } = await import('@/services/supabase');
      const { error } = await supabase
        .from('passagens')
        .update({
          cancelado_em: new Date().toISOString(),
          motivo_cancelamento: 'Cancelado pelo usuário',
          status_pagamento: 'reembolsado',
        })
        .in('id', passagemIds);

      if (error) throw error;

      const mensagem = passagemIds.length > 1
        ? `${passagemIds.length} passagens canceladas com sucesso`
        : 'Passagem cancelada com sucesso';

      Alert.alert('Sucesso', mensagem);

      // Recarrega a lista
      if (user?.id) {
        fetchTickets(user.id);
      }
    } catch (error: any) {
      console.error('Erro ao cancelar passagem:', error);
      Alert.alert('Erro', 'Não foi possível cancelar a(s) passagem(ns). Tente novamente.');
    }
  };

  const cancelarPassagensPorGrupo = async (grupoId: string) => {
    try {
      const { supabase } = await import('@/services/supabase');
      
      // Busca todas as passagens ativas do grupo
      const { data: passagens, error: fetchError } = await supabase
        .from('passagens')
        .select('id')
        .eq('grupo_id', grupoId)
        .is('cancelado_em', null);

      if (fetchError) throw fetchError;

      if (!passagens || passagens.length === 0) {
        Alert.alert('Aviso', 'Não há passagens ativas para cancelar neste grupo.');
        return;
      }

      const passagemIds = passagens.map(p => p.id);
      await cancelarPassagens(passagemIds);
    } catch (error: any) {
      console.error('Erro ao cancelar grupo de passagens:', error);
      Alert.alert('Erro', 'Não foi possível cancelar as passagens do grupo. Tente novamente.');
    }
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
          filteredTickets.map((ticket, index) => {
            // Renderiza apenas a primeira passagem de cada grupo
            if (!isFirstInGroup(ticket, index)) return null;
            
            const groupCount = getGroupCount(ticket);
            const hasGroup = groupCount > 1;

            return (
              <Card key={ticket.id} style={styles.ticketCard}>
                <Card.Content style={styles.cardContent}>
                  {/* Badge de Grupo */}
                  {hasGroup && (
                    <View style={styles.groupBadge}>
                      <MaterialIcons name="people" size={16} color="#0066CC" />
                      <Text style={styles.groupBadgeText}>
                        {groupCount} passagens neste grupo
                      </Text>
                    </View>
                  )}

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
                      {format(new Date(ticket.trips.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {ticket.trips.departure_time}
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
                        buttonColor="#0066CC"
                        textColor="#FFFFFF"
                      >
                        {hasGroup ? 'Ver QR Codes' : 'Ver QR Code'}
                      </Button>
                      <Button
                        mode="text"
                        onPress={() => handleCancelTicket(ticket.id)}
                        style={styles.cancelButton}
                        labelStyle={styles.cancelButtonLabel}
                      >
                        Cancelar Passagem{hasGroup ? 's' : ''}
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
            );
          })
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
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  groupBadgeText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '600',
    marginLeft: 6,
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