// Caminho do arquivo: app/(tabs)/trip-details.tsx
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { ItemCompra, Tarifa } from '@/types';
import { isValidCPF } from '@/utils/validators';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Checkbox, IconButton, Menu, TextInput } from 'react-native-paper';
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
  area_total_m2: number;
  area_ocupada_m2: number;
  area_disponivel_m2: number;
  preco_pedestre: number;
  preco_veiculo: number;
}

export default function TripDetailsPage() {
  const { ticketId, tripId } = useLocalSearchParams<{ ticketId?: string; tripId?: string }>();
  const { user, profile } = useAuthStore();
  const [tripData, setTripData] = useState<TripDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [items, setItems] = useState<ItemCompra[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [driverMenuVisible, setDriverMenuVisible] = useState<string | null>(null);

  useEffect(() => {
    loadTripData();
    loadTarifas();
  }, [ticketId, tripId]);

  // Adicionar passageiro inicial com dados do usuário (se estiver logado)
  useEffect(() => {
    if (!ticketId && tarifas.length > 0 && items.length === 0) {
      // Busca tarifa de adulto
      const tarifaAdulto = tarifas.find(t => t.codigo === 'PASS_ADULTO_10_PLUS');
      if (tarifaAdulto) {
        const itemInicial: ItemCompra = {
          id: Date.now().toString(),
          tipo: 'passageiro',
          tarifa_id: tarifaAdulto.id,
          tarifa_descricao: tarifaAdulto.descricao,
          tarifa_valor: tarifaAdulto.valor_vazio,
          peso_m2: tarifaAdulto.peso_m2,
          nome: profile?.nome_completo || '',
          cpf: profile?.cpf || '',
          idade: undefined,
          placa: '',
          modelo: '',
          eh_carregado: false,
        };
        setItems([itemInicial]);
      }
    }
  }, [tarifas, ticketId]);

  // Recalcula preços automaticamente quando items mudam (motorista selecionado)
  useEffect(() => {
    if (items.length === 0 || tarifas.length === 0) return;
    
    // Coleta IDs de todos os motoristas selecionados nos veículos
    const motoristasIds = new Set(
      items
        .filter(item => item.tipo === 'veiculo' && item.motorista_id)
        .map(item => item.motorista_id!)
    );
    
    // Atualiza preços de passageiros
    let needsUpdate = false;
    const updatedItems = items.map(item => {
      if (item.tipo === 'passageiro') {
        const tarifa = tarifas.find(t => t.id === item.tarifa_id);
        const baseValue = tarifa?.valor_vazio || 0;
        
        // Se é motorista de algum veículo, não paga
        const ehMotorista = motoristasIds.has(item.id);
        const newValue = ehMotorista ? 0 : baseValue;
        
        if (newValue !== item.tarifa_valor) {
          needsUpdate = true;
          return { ...item, tarifa_valor: newValue };
        }
      }
      return item;
    });
    
    if (needsUpdate) {
      setItems(updatedItems);
    }
  }, [JSON.stringify(items.map(i => ({ id: i.id, tipo: i.tipo, motorista_id: i.motorista_id })))]);

  const loadTarifas = async () => {
    try {
      const { data, error } = await supabase
        .from('tarifas')
        .select('*')
        .eq('ativo', true)
        .order('tipo', { ascending: true })
        .order('valor_vazio', { ascending: true });

      if (error) throw error;
      setTarifas(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar tarifas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as tarifas');
    }
  };

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
            capacidade_max_veiculos: viagemData.capacidade_max_veiculos,
            veiculos_atuais: viagemData.veiculos_atuais,
            area_total_m2: viagemData.area_total_m2 || 0,
            area_ocupada_m2: viagemData.area_ocupada_m2 || 0,
            area_disponivel_m2: viagemData.area_disponivel_m2 || 0,
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

          setTripData({
            ...viagemData,
          area_total_m2: viagemData.area_total_m2 || 0,
          area_ocupada_m2: viagemData.area_ocupada_m2 || 0,
          area_disponivel_m2: viagemData.area_disponivel_m2 || 0,
        });
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

  // Função para encurtar descrição da tarifa
  const getShortDescription = (descricao: string): string => {
    // Remove partes longas para deixar mais dinâmico
    return descricao
      .replace('Passageiros com idade ', '')
      .replace('Passageiro ', '')
      .replace('Passageiros ', '')
      .replace('idoso de ', '')
      .replace('idosos de ', '')
      .replace(' (Lei 9.985/2014 – Art. 48)', '')
      .replace(' anos', '');
  };

  // Adicionar novo item
  const addItem = (tarifa: Tarifa) => {
    const newItem: ItemCompra = {
      id: Date.now().toString(),
      tipo: tarifa.tipo,
      tarifa_id: tarifa.id,
      tarifa_descricao: tarifa.descricao,
      tarifa_valor: tarifa.valor_vazio,
      peso_m2: tarifa.peso_m2,
      nome: '',
      cpf: '',
      idade: undefined,
      placa: '',
      modelo: '',
      eh_carregado: false,
    };

    setItems([...items, newItem]);
    setMenuVisible(null);
  };

  // Remover item
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Atualizar campo de item
  const updateItem = (id: string, field: keyof ItemCompra, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Se mudou "eh_carregado", atualiza o valor
        if (field === 'eh_carregado') {
          const tarifa = tarifas.find(t => t.id === item.tarifa_id);
          if (tarifa) {
            updated.tarifa_valor = value ? tarifa.valor_carregado : tarifa.valor_vazio;
          }
        }
        
        return updated;
      }
      return item;
    }));
  };

  // Calcular total
  const calculateTotal = (): number => {
    return items.reduce((total, item) => total + item.tarifa_valor, 0);
  };

  // Calcular peso total de veículos
  const calculateTotalWeight = (): number => {
    return items
      .filter(item => item.tipo === 'veiculo')
      .reduce((total, item) => total + item.peso_m2, 0);
  };

  // Validar dados
  const validateItems = (): boolean => {
    // Verifica se há pelo menos 1 passageiro quando há veículos
    const hasVehicles = items.some(i => i.tipo === 'veiculo');
    const hasPassengers = items.some(i => i.tipo === 'passageiro');
    
    if (hasVehicles && !hasPassengers) {
      Alert.alert('Erro', 'É necessário adicionar pelo menos um passageiro para cada veículo');
      return false;
    }
    
    for (const item of items) {
      if (item.tipo === 'passageiro') {
        if (!item.nome?.trim()) {
        Alert.alert('Erro', 'Preencha o nome de todos os passageiros');
        return false;
      }
        if (!item.cpf?.trim()) {
        Alert.alert('Erro', 'Preencha o CPF de todos os passageiros');
        return false;
      }
        if (!isValidCPF(item.cpf)) {
          Alert.alert('Erro', `CPF inválido: ${item.cpf}`);
        return false;
      }
        
        // Verifica se tarifa requer idade
        const tarifa = tarifas.find(t => t.id === item.tarifa_id);
        if (tarifa?.requer_idade && !item.idade) {
          Alert.alert('Erro', 'Preencha a idade para esta tarifa');
          return false;
        }
        
        // Valida faixa etária
        if (tarifa?.requer_idade && item.idade) {
          if (tarifa.idade_minima !== null && item.idade < tarifa.idade_minima) {
            Alert.alert('Erro', `Idade mínima para "${tarifa.descricao}" é ${tarifa.idade_minima} anos`);
            return false;
          }
          if (tarifa.idade_maxima !== null && item.idade > tarifa.idade_maxima) {
            Alert.alert('Erro', `Idade máxima para "${tarifa.descricao}" é ${tarifa.idade_maxima} anos`);
            return false;
          }
        }
      } else if (item.tipo === 'veiculo') {
        if (!item.placa?.trim()) {
          Alert.alert('Erro', 'Preencha a placa de todos os veículos');
          return false;
        }
        if (!item.modelo?.trim()) {
          Alert.alert('Erro', 'Preencha o modelo de todos os veículos');
          return false;
        }
        if (!item.motorista_id) {
          Alert.alert('Erro', 'Selecione o motorista para todos os veículos');
          return false;
        }
      }
    }
    
    // Verifica vagas de pedestres
    const totalPedestres = items.filter(i => i.tipo === 'passageiro').length;
    if (tripData && totalPedestres > tripData.vagas_disponiveis) {
      Alert.alert('Erro', `Não há vagas suficientes. Disponíveis: ${tripData.vagas_disponiveis}`);
      return false;
    }
    
    // Verifica espaço para veículos
    const pesoTotal = calculateTotalWeight();
    if (tripData && pesoTotal > tripData.area_disponivel_m2) {
      Alert.alert('Erro', `Não há espaço suficiente para estes veículos. Espaço disponível: ${tripData.area_disponivel_m2.toFixed(1)}m²`);
      return false;
    }
    
    return true;
  };

  const handleFinishPurchase = async () => {
    if (!user?.id || !tripData) {
      Alert.alert('Atenção', 'É necessário estar logado para comprar passagens');
      router.push('/login');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos um item à compra');
      return;
    }

    if (!validateItems()) {
      return;
    }

    setIsProcessing(true);

    try {
      // Gera um grupo_id único para todas as passagens desta compra
      const grupo_id = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      // Separa passageiros e veículos
      const passageiros = items.filter(item => item.tipo === 'passageiro');
      const veiculos = items.filter(item => item.tipo === 'veiculo');
      
      // Array de promessas para inserção
      const promessas: Promise<any>[] = [];

      // Adiciona todos os passageiros
      passageiros.forEach(pass => {
        const tarifa = tarifas.find(t => t.id === pass.tarifa_id);
        promessas.push(
          supabase.from('passagens').insert({
          usuario_id: user.id,
          viagem_id: tripData.id,
          tipo_passagem: 'pedestre',
            nome_passageiro: pass.nome!,
            cpf_passageiro: pass.cpf!.replace(/[^\d]/g, ''),
            idade: pass.idade,
            categoria_passageiro: getCategoriaFromTarifa(tarifa),
            tarifa_id: pass.tarifa_id,
          quantidade: 1,
            preco_pago: pass.tarifa_valor,
            peso_veiculo_m2: 0,
            grupo_id: grupo_id,
          status_pagamento: 'pago',
          metodo_pagamento: 'pix',
          }).select().single()
        );
      });

      // Adiciona veículos
      veiculos.forEach(veic => {
        const tarifa = tarifas.find(t => t.id === veic.tarifa_id);
        promessas.push(
          supabase.from('passagens').insert({
            usuario_id: user.id,
            viagem_id: tripData.id,
            tipo_passagem: 'veiculo',
            nome_passageiro: profile?.nome_completo || 'Proprietário',
            cpf_passageiro: (profile?.cpf || '00000000000').replace(/[^\d]/g, ''),
            placa_veiculo: veic.placa!,
            modelo_veiculo: veic.modelo!,
            categoria_veiculo: tarifa?.codigo || '',
            eh_carregado: veic.eh_carregado || false,
            tarifa_id: veic.tarifa_id,
            quantidade: 1,
            preco_pago: veic.tarifa_valor,
            peso_veiculo_m2: veic.peso_m2,
            grupo_id: grupo_id,
            status_pagamento: 'pago',
            metodo_pagamento: 'pix',
          }).select().single()
        );
      });

      // Executa todas as inserções
      const resultados = await Promise.all(promessas);
      
      // Verifica se alguma inserção falhou
      const erros = resultados.filter(r => r.error);
      if (erros.length > 0) {
        throw new Error(erros[0].error.message);
      }

      const passagensCriadas = resultados.map(r => r.data).filter(Boolean);

      // Verifica se a viagem permite embarque (agendada, embarcando ou atrasada)
      // Exclui apenas viagens que já partiram, chegaram ou foram canceladas
      const statusPermiteFila = ['agendada', 'embarcando', 'atrasada'].includes(tripData.status_viagem);
      
      if (statusPermiteFila && passagensCriadas.length > 0) {
        // Adiciona cada passagem na fila digital com prioridade baseada na categoria
        const filaPriority: Record<string, number> = {
          'idoso': 1,
          'pcd': 1,
          'crianca': 3,
          'estudante': 4,
          'adulto': 5,
        };

        const filaPromessas = passagensCriadas.map((passagem: any) => {
          const categoria = passagem.categoria_passageiro || 'adulto';
          const prioridade = filaPriority[categoria] || 5;

          return supabase.from('fila_digital').insert({
            usuario_id: user.id,
            viagem_id: tripData.id,
            passagem_id: passagem.id,
            posicao: 9999, // Será recalculado pelo trigger de reordenação
            prioridade: prioridade,
            status: 'aguardando',
          });
        });

        await Promise.all(filaPromessas);
      }

      Alert.alert(
        'Sucesso!',
        items.length > 1 
          ? `${items.length} passagens foram criadas com sucesso! Todas compartilham o mesmo QR Code.`
          : 'Sua passagem foi criada com sucesso!',
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

  // Auxiliar para mapear tarifa para categoria antiga
  const getCategoriaFromTarifa = (tarifa?: Tarifa): string => {
    if (!tarifa) return 'adulto';
    
    const codigo = tarifa.codigo;
    if (codigo.includes('CRIANCA')) return 'crianca';
    if (codigo.includes('IDOSO')) return 'idoso';
    if (codigo.includes('ESTUDANTE')) return 'estudante';
    return 'adulto';
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
    if (timeStr && timeStr.includes(':')) {
      const parts = timeStr.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  const getTarifaById = (id: string): Tarifa | undefined => {
    return tarifas.find(t => t.id === id);
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
        {/* Card Principal - Informações da Viagem */}
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
            <Text style={styles.boardingLabel}>Espaço para Veículos</Text>
            <Text style={styles.boardingValue}>
              {tripData.area_disponivel_m2.toFixed(1)}m² disponíveis
            </Text>
          </View>
        </View>

        {/* Card de Itens de Compra - Apenas se NÃO for ticketId */}
        {!ticketId && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Passagens e Veículos</Text>
                <Button 
                  mode="outlined" 
                  onPress={() => setMenuVisible('main')}
                  style={styles.addButton} 
                  labelStyle={styles.addButtonLabel}
                  icon="plus"
                >
                  Adicionar
                </Button>
              </View>
              
              {/* Menu de seleção de tipo */}
              {menuVisible === 'main' && (
                <View style={styles.menuContainer}>
                  <Button 
                    mode="contained" 
                    onPress={() => setMenuVisible('passageiros')}
                    style={styles.menuButtonPrimary}
                    icon="account"
                    buttonColor="#0066CC"
                  >
                    Passageiros
                  </Button>
                  <Button 
                    mode="contained" 
                    onPress={() => setMenuVisible('veiculos')}
                    style={styles.menuButtonPrimary}
                    icon="car"
                    buttonColor="#0066CC"
                  >
                    Veículos
                  </Button>
                  <Button 
                    mode="outlined" 
                    onPress={() => setMenuVisible(null)}
                    style={styles.menuButtonSecondary}
                    textColor="#666"
                  >
                    Cancelar
                  </Button>
                </View>
              )}

              {/* Lista de tarifas de passageiros */}
              {menuVisible === 'passageiros' && (
                <View style={styles.menuContainer}>
                  <Text style={styles.menuTitle}>Selecione a tarifa:</Text>
                  <ScrollView style={styles.menuScroll}>
                    {tarifas.filter(t => t.tipo === 'passageiro').map(tarifa => (
                      <Button
                        key={tarifa.id}
                        mode="outlined"
                        onPress={() => addItem(tarifa)}
                        style={styles.tarifaButton}
                        contentStyle={styles.tarifaButtonContent}
                        textColor="#0066CC"
                      >
                        {getShortDescription(tarifa.descricao)} - R$ {tarifa.valor_vazio.toFixed(2)}
                      </Button>
                    ))}
                  </ScrollView>
                  <Button 
                    mode="outlined" 
                    onPress={() => setMenuVisible('main')}
                    style={styles.menuButtonSecondary}
                    textColor="#666"
                  >
                    Voltar
                  </Button>
                </View>
              )}

              {/* Lista de tarifas de veículos */}
              {menuVisible === 'veiculos' && (
                <View style={styles.menuContainer}>
                  <Text style={styles.menuTitle}>Selecione o tipo de veículo:</Text>
                  <ScrollView style={styles.menuScroll}>
                    {tarifas.filter(t => t.tipo === 'veiculo').map(tarifa => (
                      <Button
                        key={tarifa.id}
                        mode="outlined"
                        onPress={() => addItem(tarifa)}
                        style={styles.tarifaButton}
                        contentStyle={styles.tarifaButtonContent}
                        textColor="#0066CC"
                      >
                        {tarifa.descricao} - R$ {tarifa.valor_vazio.toFixed(2)}
                      </Button>
                    ))}
                  </ScrollView>
                  <Button 
                    mode="outlined" 
                    onPress={() => setMenuVisible('main')}
                    style={styles.menuButtonSecondary}
                    textColor="#666"
                  >
                    Voltar
                  </Button>
                </View>
              )}
              
              {/* Lista de Itens */}
              {items.length === 0 && (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="info-outline" size={48} color="#999" />
                  <Text style={styles.emptyText}>
                    Nenhum item adicionado. Clique em "Adicionar" para começar.
                  </Text>
                </View>
              )}

              {items.map((item, index) => {
                const tarifa = getTarifaById(item.tarifa_id);
                return (
                  <View key={item.id} style={styles.itemContainer}>
                    <View style={styles.itemHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>
                        {item.tipo === 'passageiro' ? 'Passageiro' : 'Veículo'} {index + 1}
                      </Text>
                      <Text style={styles.itemSubtitle} numberOfLines={2}>
                        {item.tipo === 'passageiro' 
                          ? getShortDescription(item.tarifa_descricao)
                          : item.tarifa_descricao}
                      </Text>
                      <Text style={styles.itemPrice}>
                        R$ {item.tarifa_valor.toFixed(2)}
                        {tarifa?.observacao && (
                          <Text style={styles.itemObs}> • {tarifa.observacao}</Text>
                        )}
                      </Text>
                    </View>
                      <MaterialIcons 
                        name="close" 
                        size={24} 
                        color="#F44336" 
                        onPress={() => removeItem(item.id)}
                      />
                  </View>
                  
                    {item.tipo === 'passageiro' ? (
                      <>
                  <TextInput
                          label="Nome completo *"
                          value={item.nome}
                          onChangeText={(text) => updateItem(item.id, 'nome', text)}
                    mode="outlined"
                    style={styles.input}
                    outlineColor="#000000"
                    activeOutlineColor="#0066CC"
                          textColor="#000000"
                          theme={{ colors: { background: '#FFFFFF', text: '#000000' } }}
                  />
                  
                  <TextInput
                          label="CPF *"
                          value={item.cpf}
                          onChangeText={(text) => updateItem(item.id, 'cpf', text)}
                    mode="outlined"
                    keyboardType="numeric"
                    maxLength={14}
                    style={styles.input}
                    outlineColor="#000000"
                    activeOutlineColor="#0066CC"
                          textColor="#000000"
                          theme={{ colors: { background: '#FFFFFF', text: '#000000' } }}
                  />
                      </>
                    ) : (
                      <>
                        <TextInput
                          label="Placa do veículo *"
                          value={item.placa}
                          onChangeText={(text) => updateItem(item.id, 'placa', text.toUpperCase())}
                          mode="outlined"
                          maxLength={8}
                          style={styles.input}
                          outlineColor="#000000"
                          activeOutlineColor="#0066CC"
                          textColor="#000000"
                          theme={{ colors: { background: '#FFFFFF', text: '#000000' } }}
                        />
                        
                        <TextInput
                          label="Modelo do veículo *"
                          value={item.modelo}
                          onChangeText={(text) => updateItem(item.id, 'modelo', text)}
                          mode="outlined"
                          style={styles.input}
                          outlineColor="#000000"
                          activeOutlineColor="#0066CC"
                          textColor="#000000"
                          theme={{ colors: { background: '#FFFFFF', text: '#000000' } }}
                        />

                        {/* Dropdown para selecionar motorista */}
                        <View style={styles.driverSelectorContainer}>
                          <Text style={styles.driverSelectorLabel}>Motorista deste veículo *</Text>
                          <Menu
                            visible={driverMenuVisible === item.id}
                            onDismiss={() => setDriverMenuVisible(null)}
                            anchor={
                              <Button
                                mode="outlined"
                                onPress={() => setDriverMenuVisible(item.id)}
                                style={styles.driverSelectorButton}
                                contentStyle={styles.driverSelectorButtonContent}
                                textColor="#0066CC"
                                icon="account"
                              >
                                {item.motorista_id 
                                  ? (() => {
                                      const motorista = items.find(i => i.id === item.motorista_id);
                                      if (motorista?.nome?.trim()) {
                                        return motorista.nome;
                                      }
                                      const passageiroIndex = items.filter(i => i.tipo === 'passageiro').findIndex(i => i.id === item.motorista_id);
                                      return `Passageiro ${passageiroIndex + 1}`;
                                    })()
                                  : 'Selecionar motorista'}
                              </Button>
                            }
                          >
                            {items
                              .filter(i => i.tipo === 'passageiro')
                              .map((passageiro, idx) => {
                                // Verifica se este passageiro já é motorista de outro veículo
                                const jaEhMotorista = items.some(
                                  v => v.tipo === 'veiculo' && v.id !== item.id && v.motorista_id === passageiro.id
                                );
                                
                                return (
                                  <Menu.Item
                                    key={passageiro.id}
                                    onPress={() => {
                                      if (jaEhMotorista) {
                                        Alert.alert(
                                          'Atenção',
                                          'Este passageiro já é motorista de outro veículo. Um passageiro pode ser motorista de apenas um veículo.',
                                          [{ text: 'OK' }]
                                        );
                                        setDriverMenuVisible(null);
                                        return;
                                      }
                                      updateItem(item.id, 'motorista_id', passageiro.id);
                                      setDriverMenuVisible(null);
                                    }}
                                    title={passageiro.nome?.trim() || `Passageiro ${idx + 1}`}
                                    titleStyle={jaEhMotorista ? { color: '#999999' } : undefined}
                                    leadingIcon={item.motorista_id === passageiro.id ? 'check' : jaEhMotorista ? 'account-off' : 'account'}
                                  />
                                );
                              })}
                          </Menu>
                          {item.motorista_id && (
                            <Text style={styles.driverSelectorHint}>
                              ✓ Motorista não paga passagem
                            </Text>
                          )}
                        </View>

                        {tarifa && tarifa.valor_carregado > 0 && (
                          <View style={[
                            styles.vehicleLoadedContainer,
                            item.eh_carregado && styles.vehicleLoadedContainerActive
                          ]}>
                            <Checkbox
                              status={item.eh_carregado ? 'checked' : 'unchecked'}
                              onPress={() => updateItem(item.id, 'eh_carregado', !item.eh_carregado)}
                              color="#0066CC"
                            />
                            <View style={styles.vehicleLoadedContent}>
                              <Text style={[
                                styles.vehicleLoadedLabel,
                                item.eh_carregado && styles.vehicleLoadedLabelActive
                              ]}>
                                Veículo carregado
                              </Text>
                              <Text style={styles.vehicleLoadedPrice}>
                                + R$ {tarifa.valor_carregado.toFixed(2)}
                              </Text>
                            </View>
                          </View>
                        )}

                        <Text style={styles.vehicleWeightInfo}>
                          Peso: {item.peso_m2.toFixed(1)}m² de área
                        </Text>
                      </>
                    )}
                  </View>
                );
              })}

              {/* Resumo de Peso */}
              {items.some(i => i.tipo === 'veiculo') && (
                <View style={styles.weightSummary}>
                  <Text style={styles.weightSummaryLabel}>
                    Área total dos veículos: {calculateTotalWeight().toFixed(1)}m²
                  </Text>
                  <Text style={styles.weightSummaryLabel}>
                    Área disponível: {tripData.area_disponivel_m2.toFixed(1)}m²
                  </Text>
                </View>
              )}
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
            disabled={isProcessing || items.length === 0}
            loading={isProcessing}
          >
            {isProcessing ? 'Processando...' : 
             items.length === 0 ? 'Adicione itens' : 
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
  
  // Card Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    borderColor: '#0066CC',
    borderWidth: 1,
  },
  addButtonLabel: {
    color: '#0066CC',
    fontSize: 14,
  },
  
  // Menu containers
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuButtonPrimary: {
    marginBottom: 12,
    backgroundColor: '#0066CC',
  },
  menuButtonSecondary: {
    marginTop: 8,
    borderColor: '#E0E0E0',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  menuScroll: {
    maxHeight: 300,
  },
  tarifaButton: {
    marginBottom: 10,
    borderColor: '#0066CC',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  tarifaButtonContent: {
    paddingVertical: 12,
    justifyContent: 'flex-start',
  },
  
  // Checkbox
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },

  // Container de veículo carregado
  vehicleLoadedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  vehicleLoadedContainerActive: {
    backgroundColor: '#EBF5FF',
    borderColor: '#0066CC',
  },
  vehicleLoadedContent: {
    flex: 1,
    marginLeft: 8,
  },
  vehicleLoadedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 2,
  },
  vehicleLoadedLabelActive: {
    color: '#0066CC',
  },
  vehicleLoadedPrice: {
    fontSize: 12,
    color: '#999999',
  },

  // Seletor de motorista (dropdown)
  driverSelectorContainer: {
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  driverSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  driverSelectorButton: {
    borderColor: '#0066CC',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  driverSelectorButtonContent: {
    paddingVertical: 8,
    justifyContent: 'flex-start',
  },
  driverSelectorHint: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '600',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Container vazio
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },

  // Itens
  itemContainer: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0066CC',
    marginTop: 4,
  },
  itemObs: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999',
  },
  input: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  vehicleWeightInfo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  weightSummary: {
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  weightSummaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 4,
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
    color: '#FFFFFF',
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
