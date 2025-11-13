// Caminho do arquivo: app/operator/scanner.tsx
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScannerPage() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user, role } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user || role !== 'operador') {
      Alert.alert('Acesso negado', 'Você não tem permissão para acessar esta área.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    }
  }, [user, role]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!scanning || processing) return;

    setScanning(false);
    setProcessing(true);

    try {
      // 1. Validar QR code
      const { data: validationData, error: validationError } = await supabase.rpc(
        'validar_qr_code',
        { qr_code_hash: data }
      );

      if (validationError) throw validationError;

      if (!validationData.success) {
        Alert.alert('QR Code Inválido', validationData.message, [
          { text: 'OK', onPress: () => setScanning(true) },
        ]);
        setProcessing(false);
        return;
      }

      const passagemData = validationData.data;

      // Verifica se já foi usada
      if (passagemData.usado_em) {
        Alert.alert(
          'Passagem Já Usada',
          `Esta passagem já foi escaneada em ${new Date(passagemData.usado_em).toLocaleString('pt-BR')}.`,
          [{ text: 'OK', onPress: () => setScanning(true) }]
        );
        setProcessing(false);
        return;
      }

      // Verifica se foi cancelada
      if (passagemData.cancelado_em) {
        Alert.alert('Passagem Cancelada', 'Esta passagem foi cancelada e não pode ser usada.', [
          { text: 'OK', onPress: () => setScanning(true) },
        ]);
        setProcessing(false);
        return;
      }

      // Verifica se é para esta viagem
      if (passagemData.viagem.id !== tripId) {
        Alert.alert(
          'Viagem Incorreta',
          `Esta passagem é para a rota ${passagemData.viagem.origem} → ${passagemData.viagem.destino} às ${passagemData.viagem.horario_saida}.`,
          [{ text: 'OK', onPress: () => setScanning(true) }]
        );
        setProcessing(false);
        return;
      }

      // 2. Marcar como usada
      const { data: resultData, error: markError } = await supabase.rpc(
        'marcar_passagem_como_usada',
        { passagem_uuid: passagemData.id }
      );

      if (markError) throw markError;

      if (!resultData.success) {
        Alert.alert('Erro', resultData.message, [
          { text: 'OK', onPress: () => setScanning(true) },
        ]);
        setProcessing(false);
        return;
      }

      // Sucesso!
      Alert.alert(
        'Embarque Confirmado! ✓',
        `Passageiro: ${passagemData.nome_passageiro}\nBilhete: ${passagemData.numero_bilhete}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setScanning(true);
              setProcessing(false);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Erro ao processar QR code:', error);
      Alert.alert('Erro', 'Não foi possível processar o QR code.', [
        { text: 'OK', onPress: () => setScanning(true) },
      ]);
      setProcessing(false);
    }
  };

  if (!permission) {
    return <LoadingSpinner fullScreen message="Carregando câmera..." />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <MaterialIcons name="camera-alt" size={64} color="#CCCCCC" />
          <Text style={styles.permissionTitle}>Permissão de Câmera Necessária</Text>
          <Text style={styles.permissionText}>
            Precisamos da sua permissão para usar a câmera e escanear os QR codes das passagens.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Permitir Câmera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escanear QR Code</Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
        </CameraView>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          {processing
            ? 'Processando...'
            : scanning
            ? 'Aponte a câmera para o QR Code da passagem'
            : 'QR Code detectado!'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructions: {
    backgroundColor: '#0066CC',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  instructionsText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F5F5F5',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});



