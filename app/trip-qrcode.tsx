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
  // Recebe o ID da passagem ou grupo da rota anterior
  const { ticketId, grupoId } = useLocalSearchParams<{ ticketId?: string; grupoId?: string }>();

  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTicketData();
  }, [ticketId, grupoId]);

  const loadTicketData = async () => {
    try {
      setIsLoading(true);

      let query = supabase
        .from('passagens')
        .select(`
          id,
          numero_bilhete,
          nome_passageiro,
          tipo_passagem,
          codigo_qr,
          grupo_id,
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
        `);

      // Se grupoId foi fornecido, busca todas as passagens do grupo
      if (grupoId) {
        query = query.eq('grupo_id', grupoId).is('cancelado_em', null);
      } else if (ticketId) {
        // Se apenas ticketId, verifica se há grupo e busca todas as passagens do grupo
        const { data: passagem } = await supabase
          .from('passagens')
          .select('grupo_id')
          .eq('id', ticketId)
          .single();

        if (passagem?.grupo_id) {
          // Se tem grupo, busca todas as passagens do grupo
          query = query.eq('grupo_id', passagem.grupo_id).is('cancelado_em', null);
        } else {
          // Se não tem grupo, busca apenas esta passagem
          query = query.eq('id', ticketId);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Passagem não encontrada');
      }

      // Mapeia os dados para o formato esperado
      const mappedTickets: TicketData[] = data.map((item: any) => {
        const viagem = Array.isArray(item.viagens) ? item.viagens[0] : item.viagens;
        const rota = Array.isArray(viagem?.rotas) ? viagem.rotas[0] : viagem?.rotas;
        const embarcacao = Array.isArray(viagem?.embarcacoes) ? viagem.embarcacoes[0] : viagem?.embarcacoes;

        return {
          id: item.id,
          numero_bilhete: item.numero_bilhete,
          nome_passageiro: item.nome_passageiro,
          tipo_passagem: item.tipo_passagem,
          codigo_qr: item.codigo_qr,
          data_viagem: viagem?.data_viagem || '',
          horario_saida: viagem?.horario_saida || '',
          origem: rota?.origem || '',
          destino: rota?.destino || '',
          embarcacao_nome: embarcacao?.nome || '',
        };
      });

      setTickets(mappedTickets);
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

  if (!tickets || tickets.length === 0) {
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

  // Formata horário removendo segundos (HH:MM:SS -> HH:MM)
  const formatTime = (timeStr: string) => {
    if (timeStr && timeStr.includes(':')) {
      const parts = timeStr.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  const multipleTickets = tickets.length > 1;
  const firstTicket = tickets[0];

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
        <Text style={styles.headerTitle}>
          {multipleTickets ? `QR Codes (${tickets.length})` : 'QR Code da Passagem'}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {multipleTickets && (
          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={20} color="#0066CC" />
            <Text style={styles.infoText}>
              Esta compra possui {tickets.length} passagens. Apresente cada QR code no embarque.
            </Text>
          </View>
        )}

        {tickets.map((ticket, index) => (
          <Card key={ticket.id} style={[styles.card, index > 0 && styles.cardSpacing]}>
            <Card.Content style={styles.cardContent}>
              {multipleTickets && (
                <Text style={styles.ticketCounter}>Passagem {index + 1} de {tickets.length}</Text>
              )}
              
              <Title style={styles.cardTitle}>Apresente no embarque</Title>
              
              {/* Número do bilhete */}
              <Text style={styles.ticketNumber}>{ticket.numero_bilhete}</Text>
              
              {/* QR Code */}
              <View style={styles.qrCodeContainer}>
                <QRCode
                  value={ticket.codigo_qr}
                  size={220}
                  backgroundColor="white"
                  color="#004080"
                />
              </View>

              {/* Detalhes da Viagem */}
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="person" size={20} color="#0066CC" />
                  <Paragraph style={styles.detailText}>{ticket.nome_passageiro}</Paragraph>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="route" size={20} color="#0066CC" />
                  <Paragraph style={styles.detailText}>
                    {ticket.origem} → {ticket.destino}
                  </Paragraph>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="event" size={20} color="#0066CC" />
                  <Paragraph style={styles.detailText}>
                    {formatDate(ticket.data_viagem)} às {formatTime(ticket.horario_saida)}
                  </Paragraph>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="directions-boat" size={20} color="#0066CC" />
                  <Paragraph style={styles.detailText}>{ticket.embarcacao_nome}</Paragraph>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}

        <Paragraph style={styles.footerText}>
          {multipleTickets 
            ? 'Mostre cada código para o operador no portão de embarque.'
            : 'Mostre este código para o operador no portão de embarque.'}
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    maxWidth: 400,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0066CC',
    lineHeight: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
  },
  cardSpacing: {
    marginTop: 16,
  },
  cardContent: {
    alignItems: 'center',
    padding: 16,
  },
  ticketCounter: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 8,
    textAlign: 'center',
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

