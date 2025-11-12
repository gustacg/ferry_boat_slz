// Caminho do arquivo: app/(tabs)/trip-details.tsx
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { PASSENGER_PRICES, PassengerCategory, PassengerInfo } from '@/types';
import { isValidCPF } from '@/utils/validators';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, IconButton, Menu, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TripDetailsData {
  id: string;
  data_viagem: string;
  horario_saida: string;
  origem: string;
  destino: string;
  embarcacao_nome: string;
  operadora: string;
  status_viagem: string;
  vagas_disponiveis: number;
  capacidade_max_veiculos: number;
  veiculos_atuais: number;
  preco_pedestre: number;
  preco_veiculo: number;
}

export default function TripDetailsPage() {
  const { ticketId, tripId } = useLocalSearchParams<{ ticketId?: string; tripId?: string }>();
  const { user, profile } = useAuthStore();
  const [tripData, setTripData] = useState<TripDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passengers, setPassengers] = useState<PassengerInfo[]>([{
    id: '1',
    name: profile?.nome_completo || '',
    cpf: profile?.cpf || '',
    category: 'adult',
    is_driver: false,
  }]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState<string | null>(null);

  useEffect(() => {
    loadTripData();
  }, [ticketId, tripId]);

  const loadTripData = async () => {
    try {
      setIsLoading(true);

      // Se tiver ticketId, busca dados da passagem
      if (ticketId) {
        const { data: ticketData, error: ticketError } = await supabase
          .from('minhas_passagens')
          .select('*')
          .eq('id', ticketId)
          .single();

        if (ticketError) throw ticketError;
        if (!ticketData) throw new Error('Passagem não encontrada');

        // Busca detalhes adicionais da viagem
        const { data: viagemData, error: viagemError } = await supabase
          .from('viagens_disponiveis')
          .select('*')
          .eq('id', ticketData.viagem_id)
          .single();

        if (!viagemError && viagemData) {
          // Busca informações adicionais da viagem (capacidade de veículos e veículos atuais)
          const { data: viagemCompleta, error: viagemCompletaError } = await supabase
            .from('viagens')
            .select('capacidade_max_veiculos, veiculos_atuais')
            .eq('id', ticketData.viagem_id)
            .single();

          setTripData({
            id: viagemData.id,
            data_viagem: ticketData.data_viagem,
            horario_saida: ticketData.horario_saida,
            origem: ticketData.origem,
            destino: ticketData.destino,
            embarcacao_nome: ticketData.embarcacao_nome,
            operadora: viagemData.operadora,
            status_viagem: ticketData.status_viagem,
            vagas_disponiveis: viagemData.vagas_disponiveis,
            capacidade_max_veiculos: viagemCompleta?.capacidade_max_veiculos || 0,
            veiculos_atuais: viagemCompleta?.veiculos_atuais || 0,
            preco_pedestre: viagemData.preco_pedestre,
            preco_veiculo: viagemData.preco_veiculo,
          });
        }
      }
      // Se tiver tripId, busca dados diretamente da viagem
      else if (tripId) {
        const { data: viagemData, error: viagemError } = await supabase
          .from('viagens_disponiveis')
          .select('*')
          .eq('id', tripId)
          .single();

        if (viagemError) throw viagemError;
        if (!viagemData) throw new Error('Viagem não encontrada');

        // Busca informações adicionais da viagem (capacidade de veículos e veículos atuais)
        const { data: viagemCompleta, error: viagemCompletaError } = await supabase
          .from('viagens')
          .select('capacidade_max_veiculos, veiculos_atuais')
          .eq('id', tripId)
          .single();

        if (!viagemCompletaError && viagemCompleta) {
          setTripData({
            ...viagemData,
            capacidade_max_veiculos: viagemCompleta.capacidade_max_veiculos,
            veiculos_atuais: viagemCompleta.veiculos_atuais,
          });
        } else {
          setTripData({
            ...viagemData,
            capacidade_max_veiculos: 0,
            veiculos_atuais: 0,
          });
        }
      } else {
        throw new Error('ID da viagem ou passagem não fornecido');
      }
    } catch (error: any) {
      console.error('Erro ao carregar detalhes:', error);
      Alert.alert(
        'Erro',
        'Não foi possível carregar os detalhes da viagem.',
        [
          {
            text: 'Voltar',
            onPress: () => router.back(),
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Funções de gerenciamento de passageiros
  const addPassenger = () => {
    const newId = (passengers.length + 1).toString();
    setPassengers([...passengers, {
      id: newId,
      name: '',
      cpf: '',
      category: 'adult',
      is_driver: false,
    }]);
  };

  const removePassenger = (id: string) => {
    if (passengers.length === 1) {
      Alert.alert('Atenção', 'É necessário ter pelo menos um passageiro');
      return;
    }
    setPassengers(passengers.filter(p => p.id !== id));
  };

  const updatePassenger = (id: string, field: keyof PassengerInfo, value: any) => {
    setPassengers(passengers.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const getCategoryLabel = (category: PassengerCategory): string => {
    const labels: Record<PassengerCategory, string> = {
      adult: 'Adulto',
      child: 'Criança (6-12 anos)',
      senior: 'Idoso (60+)',
      disabled: 'PCD',
      student: 'Estudante',
    };
    return labels[category];
  };

  const calculateTotal = (): number => {
    return passengers.reduce((total, passenger) => {
      return total + PASSENGER_PRICES[passenger.category];
    }, 0);
  };

  const validatePassengers = (): boolean => {
    for (const passenger of passengers) {
      if (!passenger.name.trim()) {
        Alert.alert('Erro', 'Preencha o nome de todos os passageiros');
        return false;
      }
      if (!passenger.cpf.trim()) {
        Alert.alert('Erro', 'Preencha o CPF de todos os passageiros');
        return false;
      }
      if (!isValidCPF(passenger.cpf)) {
        Alert.alert('Erro', `CPF inválido: ${passenger.cpf}`);
        return false;
      }
    }
    return true;
  };

  const handleFinishPurchase = async () => {
    if (!user?.id || !tripData) {
      Alert.alert('Atenção', 'É necessário estar logado para comprar passagens');
      router.push('/login');
      return;
    }

    if (!validatePassengers()) {
      return;
    }

    setIsProcessing(true);

    try {
      // Cria uma passagem para cada passageiro
      const passagensPromises = passengers.map(async (passenger) => {
        // Mapeia categoria do app para categoria do banco
        const categoriaMap: Record<PassengerCategory, string> = {
          adult: 'adulto',
          child: 'crianca',
          senior: 'idoso',
          disabled: 'pcd',
          student: 'estudante',
        };

        const passagemData = {
          usuario_id: user.id,
          viagem_id: tripData.id,
          tipo_passagem: 'pedestre',
          nome_passageiro: passenger.name,
          cpf_passageiro: passenger.cpf.replace(/[^\d]/g, ''),
          categoria_passageiro: categoriaMap[passenger.category],
          quantidade: 1,
          preco_pago: PASSENGER_PRICES[passenger.category],
          status_pagamento: 'pago',
          metodo_pagamento: 'pix',
        };

        const { data, error } = await supabase
          .from('passagens')
          .insert([passagemData])
          .select()
          .single();

        if (error) throw error;
        return data;
      });

      // Aguarda todas as passagens serem criadas
      const passagensCriadas = await Promise.all(passagensPromises);

      Alert.alert(
        'Sucesso!',
        'Sua passagem foi criada com sucesso!',
        [
          {
            text: 'Ver QR Code',
            onPress: () => {
              if (passagensCriadas.length > 0) {
                router.push({
                  pathname: '/trip-qrcode',
                  params: { ticketId: passagensCriadas[0].id }
                });
              }
            },
          },
          {
            text: 'Ver passagens',
            onPress: () => router.push('/(tabs)/tickets'),
          }
        ]
      );
    } catch (error: any) {
      console.error('Erro ao criar passagem:', error);
      Alert.alert('Erro', error.message || 'Não foi possível finalizar a compra. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Carregando detalhes..." />;
  }

  if (!tripData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>Viagem não encontrada</Text>
        </View>
      </SafeAreaView>
    );
  }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendada':
        return '#4CAF50';
      case 'embarcando':
        return '#FF9800';
      case 'partiu':
        return '#2196F3';
      case 'cancelada':
        return '#F44336';
      default:
        return '#666666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'agendada':
        return 'Agendada';
      case 'embarcando':
        return 'Embarcando';
      case 'partiu':
        return 'Em rota';
      case 'chegou':
        return 'Concluída';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header com botão voltar */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor="#FFFFFF"
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>Detalhes da Viagem</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card Principal - Informações da Viagem e Embarcação */}
        <View style={[styles.mainCard, { borderLeftColor: '#0066CC' }]}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeTitle}>{tripData.origem} → {tripData.destino}</Text>
            <Text style={styles.dateTimeText}>
              {formatDate(tripData.data_viagem)} às {formatTime(tripData.horario_saida)}
            </Text>
          </View>

          <View style={styles.boardingRow}>
            <Text style={styles.boardingLabel}>Embarcação</Text>
            <Text style={styles.boardingValue}>{tripData.embarcacao_nome}</Text>
          </View>

          <View style={styles.boardingRow}>
            <Text style={styles.boardingLabel}>Operadora</Text>
            <Text style={styles.boardingValue}>
              {tripData.operadora === 'internacional_maritima' ? 'Internacional Marítima' :
               tripData.operadora === 'henvil' ? 'Henvil' :
               tripData.operadora === 'servi_porto' ? 'Servi Porto' : tripData.operadora}
            </Text>
          </View>

          <View style={styles.boardingRow}>
            <Text style={styles.boardingLabel}>Vagas para Passageiros</Text>
            <Text style={styles.boardingValue}>{tripData.vagas_disponiveis} disponíveis</Text>
          </View>

          <View style={[styles.boardingRow, styles.lastItem]}>
            <Text style={styles.boardingLabel}>Vagas para Veículos</Text>
            <Text style={styles.boardingValue}>
              {tripData.capacidade_max_veiculos - tripData.veiculos_atuais} disponíveis
            </Text>
          </View>
        </View>

        {/* Card de Passageiros - Apenas se NÃO for ticketId (visualização de passagem) */}
        {!ticketId && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Passageiros</Text>
                <Button 
                  mode="outlined" 
                  onPress={addPassenger} 
                  style={styles.addButton} 
                  labelStyle={styles.addButtonLabel}
                  disabled={tripData.vagas_disponiveis <= passengers.length}
                >
                  Adicionar
                </Button>
              </View>
              
              {passengers.map((passenger, index) => (
                <View key={passenger.id} style={styles.passengerContainer}>
                  <View style={styles.passengerHeader}>
                    <Text style={styles.passengerTitle}>Passageiro {index + 1}</Text>
                    {passengers.length > 1 && (
                      <MaterialIcons 
                        name="close" 
                        size={24} 
                        color="#F44336" 
                        onPress={() => removePassenger(passenger.id)}
                      />
                    )}
                  </View>
                  
                  <TextInput
                    label="Nome completo"
                    value={passenger.name}
                    onChangeText={(text) => updatePassenger(passenger.id, 'name', text)}
                    mode="outlined"
                    style={styles.input}
                    outlineColor="#E0E0E0"
                    activeOutlineColor="#0066CC"
                  />
                  
                  <TextInput
                    label="CPF"
                    value={passenger.cpf}
                    onChangeText={(text) => updatePassenger(passenger.id, 'cpf', text)}
                    mode="outlined"
                    keyboardType="numeric"
                    maxLength={14}
                    style={styles.input}
                    outlineColor="#E0E0E0"
                    activeOutlineColor="#0066CC"
                  />
                  
                  <Menu
                    visible={categoryMenuVisible === passenger.id}
                    onDismiss={() => setCategoryMenuVisible(null)}
                    anchor={
                      <Button 
                        mode="outlined" 
                        onPress={() => setCategoryMenuVisible(passenger.id)}
                        style={styles.categoryButton}
                        textColor="#0066CC"
                      >
                        {getCategoryLabel(passenger.category)}
                      </Button>
                    }
                  >
                    <Menu.Item 
                      onPress={() => {
                        updatePassenger(passenger.id, 'category', 'adult');
                        setCategoryMenuVisible(null);
                      }} 
                      title="Adulto - R$ 15,00" 
                    />
                    <Menu.Item 
                      onPress={() => {
                        updatePassenger(passenger.id, 'category', 'child');
                        setCategoryMenuVisible(null);
                      }} 
                      title="Criança (6-12) - R$ 10,00" 
                    />
                    <Menu.Item 
                      onPress={() => {
                        updatePassenger(passenger.id, 'category', 'senior');
                        setCategoryMenuVisible(null);
                      }} 
                      title="Idoso (60+) - Gratuito" 
                    />
                    <Menu.Item 
                      onPress={() => {
                        updatePassenger(passenger.id, 'category', 'disabled');
                        setCategoryMenuVisible(null);
                      }} 
                      title="PCD - Gratuito" 
                    />
                    <Menu.Item 
                      onPress={() => {
                        updatePassenger(passenger.id, 'category', 'student');
                        setCategoryMenuVisible(null);
                      }} 
                      title="Estudante - R$ 12,00" 
                    />
                  </Menu>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Espaçamento para o botão fixo */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer com Total e Botão - Apenas se NÃO for ticketId */}
      {!ticketId && (
        <View style={styles.footer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>
              R$ {calculateTotal().toFixed(2).replace('.', ',')}
            </Text>
          </View>
          <Button
            mode="contained"
            onPress={handleFinishPurchase}
            style={styles.finishButton}
            labelStyle={styles.finishButtonLabel}
            disabled={isProcessing || tripData.vagas_disponiveis === 0}
            loading={isProcessing}
          >
            {isProcessing ? 'Processando...' : 
             tripData.vagas_disponiveis === 0 ? 'Sem vagas' : 
             'Finalizar Compra'}
          </Button>
        </View>
      )}
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
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  
  // Card Principal
  mainCard: {
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
  
  // Cards Gerais
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  
  // Embarcação
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
  
  // Último item sem borda
  lastItem: {
    borderBottomWidth: 0,
  },
  
  // Card Header (Passageiros)
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    borderColor: '#0066CC',
    borderWidth: 1,
  },
  addButtonLabel: {
    color: '#0066CC',
    fontSize: 14,
  },
  
  // Passageiros
  passengerContainer: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passengerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  input: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  categoryButton: {
    borderColor: '#0066CC',
    borderWidth: 1,
    marginBottom: 12,
  },
  
  // Footer com botão e total
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  finishButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 8,
  },
  finishButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginTop: 16,
    textAlign: 'center',
  },
});