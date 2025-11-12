// Caminho do arquivo: app/faq.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export default function FAQPage() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const faqData: FAQItem[] = [
    {
      id: '1',
      question: 'Como comprar uma passagem?',
      answer: 'Você pode comprar passagens diretamente pelo app na seção \'Horários\'. Selecione o horário desejado, clique em \'Comprar passagem\' e siga as instruções de pagamento.',
    },
    {
      id: '2',
      question: 'Posso cancelar minha passagem?',
      answer: 'Sim, passagens podem ser canceladas com até 2 horas de antecedência da viagem. O reembolso será feito em até 5 dias úteis. Acesse \'Minhas Passagens\' e selecione a opção de cancelamento.',
    },
    {
      id: '3',
      question: 'Como funciona a fila em tempo real?',
      answer: 'O sistema monitora a fila de embarque em tempo real. Você pode ver sua posição atual e receber notificações quando estiver próximo do seu momento de embarque.',
    },
    {
      id: '4',
      question: 'Preciso imprimir o bilhete?',
      answer: 'Não! Nosso sistema é 100% digital. Basta apresentar o QR Code do seu bilhete digital no momento do embarque diretamente pelo app.',
    },
    {
      id: '5',
      question: 'Quanto tempo antes devo chegar?',
      answer: 'Recomendamos chegar com pelo menos 20 minutos de antecedência. O embarque fecha 10 minutos antes da partida programada.',
    },
    {
      id: '6',
      question: 'Posso levar bagagem?',
      answer: 'Sim, cada passageiro tem direito a 1 bagagem de mão de até 10kg. Bagagens maiores devem ser declaradas e podem ter custo adicional.',
    },
    {
      id: '7',
      question: 'O que fazer se perder o horário?',
      answer: 'Se perder seu horário, você pode tentar remarcar para o próximo ferry disponível sem custo adicional, sujeito à disponibilidade. Entre em contato com a equipe no embarque.',
    },
    {
      id: '8',
      question: 'Como funciona o pagamento?',
      answer: 'Aceitamos cartão de crédito, débito e PIX. O pagamento é processado de forma segura e você receberá a confirmação imediatamente.',
    },
    {
      id: '9',
      question: 'Posso transferir minha passagem?',
      answer: 'Sim, passagens podem ser transferidas para outra pessoa até 4 horas antes da viagem. Acesse \'Minhas Passagens\' e use a opção \'Transferir passagem\'.',
    },
    {
      id: '10',
      question: 'Há desconto para estudantes ou idosos?',
      answer: 'Sim! Estudantes com carteirinha válida têm 50% de desconto. Idosos acima de 60 anos e pessoas com deficiência viajam gratuitamente.',
    },
  ];

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleWhatsApp = () => {
    const phoneNumber = '5598000000000'; // Formato internacional
    const url = `whatsapp://send?phone=${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Erro', 'WhatsApp não está instalado');
        }
      })
      .catch(() => Alert.alert('Erro', 'Não foi possível abrir o WhatsApp'));
  };

  const handleEmail = () => {
    const email = 'suporte@ferryboat.com';
    const url = `mailto:${email}`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Perguntas{'\n'}Frequentes</Text>
          <Text style={styles.headerSubtitle}>Tire suas dúvidas</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Card de Introdução */}
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Como podemos ajudar?</Text>
          <Text style={styles.introText}>
            Aqui você encontra respostas para as perguntas mais comuns sobre o Ferry Boat.
          </Text>
        </View>

        {/* Lista de FAQs */}
        <View style={styles.faqList}>
          {faqData.map((item) => (
            <View key={item.id} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.questionText}>{item.question}</Text>
                <MaterialIcons
                  name={expandedId === item.id ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color="#666666"
                />
              </TouchableOpacity>
              
              {expandedId === item.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.answerText}>{item.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Card de Contato */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Não encontrou sua resposta?</Text>
          <Text style={styles.contactSubtitle}>
            Entre em contato com nossa equipe de suporte.
          </Text>

          <TouchableOpacity 
            style={styles.contactButton}
            onPress={handleWhatsApp}
            activeOpacity={0.7}
          >
            <MaterialIcons name="phone" size={20} color="#0066CC" />
            <View style={styles.contactButtonText}>
              <Text style={styles.contactLabel}>WhatsApp:</Text>
              <Text style={styles.contactValue}>(00) 0000-0000</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactButton}
            onPress={handleEmail}
            activeOpacity={0.7}
          >
            <MaterialIcons name="email" size={20} color="#0066CC" />
            <View style={styles.contactButtonText}>
              <Text style={styles.contactLabel}>E-mail:</Text>
              <Text style={styles.contactValue}>suporte@ferryboat.com</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Espaçamento inferior */}
        <View style={styles.bottomSpacer} />
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
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    marginRight: 16,
    marginTop: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 34,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  introCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  faqList: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  answerText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactButtonText: {
    marginLeft: 12,
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0066CC',
  },
  bottomSpacer: {
    height: 40,
  },
});