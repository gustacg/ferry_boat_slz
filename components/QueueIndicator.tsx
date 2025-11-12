import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Circle } from 'react-native-svg';

const PROJECT_COLOR = '#0066CC';
const STROKE_WIDTH = 10;
const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface QueueIndicatorProps {
  position: number;
  total: number;
}

const QueueIndicator: React.FC<QueueIndicatorProps> = ({ position, total }) => {
  if (total === 0) {
    return null; // Ou um estado de fila vazia
  }

  const progress = position / total;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={styles.container}>
      <Svg width={RADIUS * 2 + STROKE_WIDTH} height={RADIUS * 2 + STROKE_WIDTH}>
        {/* Círculo de fundo */}
        <Circle
          cx={RADIUS + STROKE_WIDTH / 2}
          cy={RADIUS + STROKE_WIDTH / 2}
          r={RADIUS}
          stroke="#E6E7E8"
          strokeWidth={STROKE_WIDTH}
        />
        {/* Círculo de progresso */}
        <Circle
          cx={RADIUS + STROKE_WIDTH / 2}
          cy={RADIUS + STROKE_WIDTH / 2}
          r={RADIUS}
          stroke={PROJECT_COLOR}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${RADIUS + STROKE_WIDTH / 2}, ${RADIUS + STROKE_WIDTH / 2})`}
        />
      </Svg>
      <View style={styles.textContainer}>
        <Text style={styles.positionText}>{position}</Text>
        <Text style={styles.totalText}>de {total}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: PROJECT_COLOR,
  },
  totalText: {
    fontSize: 14,
    color: '#666',
  },
});

export default QueueIndicator;
