import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';

const PROJECT_COLOR = '#0066CC';

interface TripCardProps {
  time: string;
  route: string;
  vacancies: number;
  status: 'Disponível' | 'Esgotado' | 'Encerrado';
}

const TripCard: React.FC<TripCardProps> = ({ time, route, vacancies, status }) => {
  const isAvailable = status === 'Disponível' && vacancies > 0;

  const onPurchase = () => {
    console.log(`Iniciando compra para a viagem: ${route} às ${time}`);
    // Navegação para o fluxo de compra
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.contentContainer}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{time}</Text>
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.routeText}>{route}</Text>
            <Text style={styles.statusText}>
              {isAvailable ? `${vacancies} vagas disponíveis` : status}
            </Text>
          </View>
          <View style={styles.actionContainer}>
            <Button
              mode="contained"
              onPress={onPurchase}
              disabled={!isAvailable}
              buttonColor={PROJECT_COLOR}
            >
              Comprar
            </Button>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 10,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeContainer: {
    paddingRight: 15,
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  timeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PROJECT_COLOR,
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  routeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#555',
  },
  actionContainer: {
    justifyContent: 'center',
  },
});

export default TripCard;
