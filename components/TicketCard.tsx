import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, Divider } from 'react-native-paper';

const PROJECT_COLOR = '#0066CC';

interface TicketCardProps {
  code: string;
  route: string;
  date: string;
  time: string;
  status: 'Válido' | 'Utilizado' | 'Expirado';
}

const TicketCard: React.FC<TicketCardProps> = ({ code, route, date, time, status }) => {
  const onShowQRCode = () => {
    console.log(`Exibindo QR Code para o bilhete: ${code}`);
    // Navegação para a tela do QR Code
  };

  return (
    <Card style={styles.card}>
      <Card.Title title={route} subtitle={`Código: ${code}`} titleStyle={styles.cardTitle} />
      <Card.Content>
        <View style={styles.row}>
          <Text style={styles.label}>Data:</Text>
          <Text style={styles.value}>{date}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Horário:</Text>
          <Text style={styles.value}>{time}</Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, styles.statusText]}>{status}</Text>
        </View>
      </Card.Content>
      <Card.Actions>
        <Button
          mode="contained"
          onPress={onShowQRCode}
          icon="qrcode"
          buttonColor={PROJECT_COLOR}
        >
          Ver QR Code
        </Button>
      </Card.Actions>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 10,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: PROJECT_COLOR
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusText: {
    color: PROJECT_COLOR,
  },
  divider: {
    marginVertical: 10,
  },
});

export default TicketCard;
