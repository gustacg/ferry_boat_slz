// Caminho do arquivo: app/operator/boarding.tsx
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Dialog, Portal } from 'react-native-paper';
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
  total_embarcados: number;
  total_na_fila: number;
}

export default function BoardingControlPage() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user, role } = useAuthStore();
  const [trip, setTrip] = useState<TripData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDepartDialog, setShowDepartDialog] = useState(false);

  useEffect(() => {
    if (!user || (role !== 'operador' && role !== 'admin')) {
      Alert.alert('Acesso negado', 'Você não tem permissão para acessar esta área.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } else if (tripId) {
      validateTripTiming();
    }
  }, [tripId, user, role]);

  const validateTripTiming = async () => {
    try {
      // Busca dados básicos da viagem
      const { data: tripData, error: tripError } = await supabase
        .from('viagens')
        .select('data_viagem, horario_saida, status')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;

      const [hour, minute] = tripData.horario_saida.split(':').map(Number);
      const tripTimeInMinutes = hour * 60 + minute;

      // Verifica se é hoje
      if (tripData.data_viagem !== today) {
        Alert.alert(
          'Viagem Indisponível',
          'Esta viagem não é para hoje. Só é possível acessar viagens no dia do embarque.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      // Verifica se está dentro de 30 minutos antes
      if (tripTimeInMinutes > (currentTimeInMinutes + 30)) {
        const minutesUntil = tripTimeInMinutes - currentTimeInMinutes - 30;
        Alert.alert(
          'Aguarde',
          `Esta viagem estará disponível em ${minutesUntil} minutos (30 minutos antes do horário de partida).`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      // Se passou na validação, carrega os dados completos
      loadTripData();
    } catch (error) {
      console.error('Erro ao validar horário:', error);
      Alert.alert('Erro', 'Não foi possível validar o horário da viagem.');
      router.back();
    }
  };

  const loadTripData = async () => {
    try {
      setIsLoading(true);

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
        .eq('id', tripId)
        .single();

      if (error) throw error;

      // Conta passageiros embarcados (usado_em preenchido)
      const { count: embarcadosCount } = await supabase
        .from('passagens')
        .select('*', { count: 'exact', head: true })
        .eq('viagem_id', tripId)
        .not('usado_em', 'is', null);

      // Conta na fila
      const { count: filaCount } = await supabase
        .from('fila_digital')
        .select('*', { count: 'exact', head: true })
        .eq('viagem_id', tripId)
        .eq('status', 'aguardando');

      setTrip({
        id: data.id,
        data_viagem: data.data_viagem,
        horario_saida: data.horario_saida,
        status: data.status,
        origem: data.rotas.origem,
        destino: data.rotas.destino,
        embarcacao_nome: data.embarcacoes.nome,
        operadora: data.embarcacoes.operadora,
        pedestres_atuais: data.pedestres_atuais,
        capacidade_max_pedestres: data.capacidade_max_pedestres,
        veiculos_atuais: data.veiculos_atuais,
        capacidade_max_veiculos: data.capacidade_max_veiculos,
        total_embarcados: embarcadosCount || 0,
        total_na_fila: filaCount || 0,
      });
    } catch (error: any) {
      console.error('Erro ao carregar viagem:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da viagem.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartBoarding = async () => {
    try {
      const { error } = await supabase
        .from('viagens')
        .update({ status: 'embarcando' })
        .eq('id', tripId);

      if (error) throw error;

      await loadTripData();
      Alert.alert('Sucesso', 'Embarque iniciado!');
    } catch (error) {
      console.error('Erro ao iniciar embarque:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o embarque.');
    }
  };

  const handleDepartTrip = async () => {
    try {
      const { error } = await supabase
        .from('viagens')
        .update({
          status: 'partiu',
          horario_saida_real: new Date().toISOString(),
        })
        .eq('id', tripId);

      if (error) throw error;

      setShowDepartDialog(false);
      Alert.alert('Sucesso', 'Viagem marcada como partiu!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Erro ao marcar partida:', error);
      Alert.alert('Erro', 'Não foi possível marcar a partida.');
    }
  };

  const handleCancelTrip = async () => {
    try {
      const { error } = await supabase
        .from('viagens')
        .update({
          status: 'cancelada',
          motivo_cancelamento: 'Cancelada pelo operador',
        })
        .eq('id', tripId);

      if (error) throw error;

      setShowCancelDialog(false);
      Alert.alert('Viagem Cancelada', 'A viagem foi cancelada com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Erro ao cancelar viagem:', error);
      Alert.alert('Erro', 'Não foi possível cancelar a viagem.');
    }
  };

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

  if (isLoading || !trip) {
    return <LoadingSpinner fullScreen message="Carregando..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Controle de Embarque</Text>
          <Text style={styles.headerSubtitle}>
            {trip.origem} → {trip.destino}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Trip Info Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Informações da Viagem</Text>

            <View style={styles.infoRow}>
              <MaterialIcons name="event" size={20} color="#666666" />
              <Text style={styles.infoText}>
                {formatDate(trip.data_viagem)} às {formatTime(trip.horario_saida)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <MaterialIcons name="directions-boat" size={20} color="#666666" />
              <Text style={styles.infoText}>{trip.embarcacao_nome}</Text>
            </View>

            <View style={styles.infoRow}>
              <MaterialIcons name="business" size={20} color="#666666" />
              <Text style={styles.infoText}>
                {trip.operadora === 'internacional_maritima'
                  ? 'Internacional Marítima'
                  : trip.operadora === 'henvil'
                  ? 'Henvil'
                  : trip.operadora === 'servi_porto'
                  ? 'Servi Porto'
                  : trip.operadora}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Stats Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Estatísticas</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{trip.total_embarcados}</Text>
                <Text style={styles.statLabel}>Embarcados</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{trip.total_na_fila}</Text>
                <Text style={styles.statLabel}>Na Fila</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {trip.pedestres_atuais}/{trip.capacidade_max_pedestres}
                </Text>
                <Text style={styles.statLabel}>Pedestres</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {trip.veiculos_atuais}/{trip.capacidade_max_veiculos}
                </Text>
                <Text style={styles.statLabel}>Veículos</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Scanner Button */}
        {trip.status === 'embarcando' && (
          <Button
            mode="contained"
            style={styles.scanButton}
            buttonColor="#4CAF50"
            textColor="#FFFFFF"
            icon="qrcode-scan"
            onPress={() => router.push({
              pathname: '/operator/scanner',
              params: { tripId: trip.id }
            } as any)}
          >
            Escanear QR Code
          </Button>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {trip.status === 'agendada' && (
            <Button
              mode="contained"
              style={styles.actionButton}
              buttonColor="#0066CC"
              textColor="#FFFFFF"
              onPress={handleStartBoarding}
            >
              Iniciar Embarque
            </Button>
          )}

          {trip.status === 'embarcando' && (
            <Button
              mode="contained"
              style={styles.actionButton}
              buttonColor="#0066CC"
              textColor="#FFFFFF"
              onPress={() => setShowDepartDialog(true)}
            >
              Marcar como Partiu
            </Button>
          )}

          {(trip.status === 'agendada' || trip.status === 'embarcando') && (
            <Button
              mode="outlined"
              style={styles.actionButton}
              textColor="#F44336"
              onPress={() => setShowCancelDialog(true)}
            >
              Cancelar Viagem
            </Button>
          )}
        </View>
      </ScrollView>

      {/* Cancel Dialog */}
      <Portal>
        <Dialog visible={showCancelDialog} onDismiss={() => setShowCancelDialog(false)}>
          <Dialog.Title>Cancelar Viagem</Dialog.Title>
          <Dialog.Content>
            <Text>Tem certeza que deseja cancelar esta viagem?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCancelDialog(false)}>Não</Button>
            <Button onPress={handleCancelTrip} textColor="#F44336">
              Sim, Cancelar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Depart Dialog */}
      <Portal>
        <Dialog visible={showDepartDialog} onDismiss={() => setShowDepartDialog(false)}>
          <Dialog.Title>Marcar como Partiu</Dialog.Title>
          <Dialog.Content>
            <Text>Confirmar que a embarcação partiu para o destino?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDepartDialog(false)}>Cancelar</Button>
            <Button onPress={handleDepartTrip}>Confirmar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0066CC',
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  scanButton: {
    marginBottom: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 6,
  },
});

