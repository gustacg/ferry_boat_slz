// Caminho do arquivo: app/trip-qrcode.tsx
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/services/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Card, IconButton, Paragraph, Text, Title } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TicketData {
  id: string;
  numero_bilhete: string;
  nome_passageiro: string;
  tipo_passagem: string;
  codigo_qr: string;
  data_viagem: string;
  horario_saida: string;
  origem: string;
  destino: string;
  embarcacao_nome: string;
}

export default function TripQRCodePage() {
  // Recebe o ID da passagem da rota anterior
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();

  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTicketData();
  }, [ticketId]);

  const loadTicketData = async () => {
    try {
      setIsLoading(true);

      // Busca dados da passagem direto da tabela passagens com joins
      const { data, error } = await supabase
        .from('passagens')
        .select(`
          id,
          numero_bilhete,
          nome_passageiro,
          tipo_passagem,
          codigo_qr,
          viagens!inner (
            data_viagem,
            horario_saida,
            rotas!inner (
              origem,
              destino
            ),
            embarcacoes!inner (
              nome
            )
          )
        `)
        .eq('id', ticketId)
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error('Passagem não encontrada');
      }

      // Mapeia os dados para o formato esperado
      const viagem = Array.isArray(data.viagens) ? data.viagens[0] : data.viagens;
      const rota = Array.isArray(viagem?.rotas) ? viagem.rotas[0] : viagem?.rotas;
      const embarcacao = Array.isArray(viagem?.embarcacoes) ? viagem.embarcacoes[0] : viagem?.embarcacoes;

      const mappedData: TicketData = {
        id: data.id,
        numero_bilhete: data.numero_bilhete,
        nome_passageiro: data.nome_passageiro,
        tipo_passagem: data.tipo_passagem,
        codigo_qr: data.codigo_qr,
        data_viagem: viagem?.data_viagem || '',
        horario_saida: viagem?.horario_saida || '',
        origem: rota?.origem || '',
        destino: rota?.destino || '',
        embarcacao_nome: embarcacao?.nome || '',
      };

      setTicketData(mappedData);
    } catch (error: any) {
      console.error('Erro ao carregar passagem:', error);
      Alert.alert(
        'Erro',
        'Não foi possível carregar os dados da passagem.',
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

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Carregando QR Code..." />;
  }

  if (!ticketData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>Passagem não encontrada</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Formata data brasileira
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho Customizado */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={28}
          iconColor="#004080"
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>QR Code da Passagem</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Title style={styles.cardTitle}>Apresente no embarque</Title>
            
            {/* Número do bilhete */}
            <Text style={styles.ticketNumber}>{ticketData.numero_bilhete}</Text>
            
            {/* QR Code */}
            <View style={styles.qrCodeContainer}>
              <QRCode
                value={ticketData.codigo_qr}
                size={220}
                backgroundColor="white"
                color="#004080"
              />
            </View>

            {/* Detalhes da Viagem */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <MaterialIcons name="person" size={20} color="#0066CC" />
                <Paragraph style={styles.detailText}>{ticketData.nome_passageiro}</Paragraph>
              </View>
              <View style={styles.detailRow}>
                <MaterialIcons name="route" size={20} color="#0066CC" />
                <Paragraph style={styles.detailText}>
                  {ticketData.origem} → {ticketData.destino}
                </Paragraph>
              </View>
              <View style={styles.detailRow}>
                <MaterialIcons name="event" size={20} color="#0066CC" />
                <Paragraph style={styles.detailText}>
                  {formatDate(ticketData.data_viagem)} às {ticketData.horario_saida}
                </Paragraph>
              </View>
              <View style={styles.detailRow}>
                <MaterialIcons name="directions-boat" size={20} color="#0066CC" />
                <Paragraph style={styles.detailText}>{ticketData.embarcacao_nome}</Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Paragraph style={styles.footerText}>
          Mostre este código para o operador no portão de embarque.
        </Paragraph>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#004080',
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
  },
  cardContent: {
    alignItems: 'center',
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 8,
    fontWeight: 'normal',
  },
  ticketNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 20,
  },
  qrCodeContainer: {
    marginBottom: 24,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailsContainer: {
    width: '100%',
    marginTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666666',
  },
  footerText: {
    marginTop: 24,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
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

