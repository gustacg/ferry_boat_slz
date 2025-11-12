// Caminho do arquivo: app/(tabs)/notifications.tsx
import { useAuthStore } from '@/stores/authStore';
import { Notification, useNotificationsStore } from '@/stores/notificationsStore';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Badge, Button, Card, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotificationsStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchNotifications(user.id);
    }
  }, [isAuthenticated, user?.id]);

  const onRefresh = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await refreshNotifications(user.id);
    setRefreshing(false);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    await markAllAsRead(user.id);
  };

  const handleDelete = async (notificationId: string) => {
    Alert.alert(
      'Excluir Notificação',
      'Deseja realmente excluir esta notificação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteNotification(notificationId),
        },
      ]
    );
  };

  const handleNotificationPress = (notification: Notification) => {
    // Marcar como lida
    if (!notification.lida) {
      handleMarkAsRead(notification.id);
    }

    // Se tem viagem relacionada, navegar para detalhes
    if (notification.viagem_relacionada_id) {
      router.push({
        pathname: '/trip-details',
        params: { tripId: notification.viagem_relacionada_id },
      });
    }
  };

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'viagem_cancelada':
        return 'cancel';
      case 'viagem_atrasada':
        return 'schedule';
      case 'embarque_proximo':
      case 'embarque_agora':
        return 'directions-boat';
      case 'lotacao_alta':
        return 'people';
      case 'promocao':
        return 'local-offer';
      case 'sistema':
        return 'info';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (tipo: string) => {
    switch (tipo) {
      case 'viagem_cancelada':
        return '#F44336';
      case 'viagem_atrasada':
        return '#FF9800';
      case 'embarque_proximo':
        return '#2196F3';
      case 'embarque_agora':
        return '#4CAF50';
      case 'lotacao_alta':
        return '#FFC107';
      case 'promocao':
        return '#9C27B0';
      case 'sistema':
        return '#607D8B';
      default:
        return '#0066CC';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notificações</Text>
        </View>
        <View style={styles.notAuthContainer}>
          <MaterialIcons name="notifications-none" size={64} color="#CCCCCC" />
          <Text style={styles.notAuthText}>Você precisa fazer login para ver suas notificações</Text>
          <Button
            mode="contained"
            onPress={() => router.push('/login')}
            style={styles.loginButton}
          >
            Fazer Login
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Notificações</Text>
          {unreadCount > 0 && (
            <Badge style={styles.headerBadge}>{unreadCount}</Badge>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Marcar todas como lidas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de Notificações */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0066CC']} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Carregando notificações...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-none" size={64} color="#CCCCCC" />
            <Text style={styles.emptyStateText}>Nenhuma notificação</Text>
            <Text style={styles.emptyStateSubtext}>
              Você será notificado sobre suas viagens e atualizações importantes
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}
            >
              <Card
                style={[
                  styles.notificationCard,
                  !notification.lida && styles.notificationUnread,
                ]}
              >
                <Card.Content style={styles.cardContent}>
                  {/* Ícone e Conteúdo */}
                  <View style={styles.notificationContent}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: getNotificationColor(notification.tipo) + '20' },
                      ]}
                    >
                      <MaterialIcons
                        name={getNotificationIcon(notification.tipo) as any}
                        size={24}
                        color={getNotificationColor(notification.tipo)}
                      />
                    </View>

                    <View style={styles.textContainer}>
                      <View style={styles.titleRow}>
                        <Text style={styles.notificationTitle}>{notification.titulo}</Text>
                        {!notification.lida && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notificationMessage}>{notification.mensagem}</Text>
                      <Text style={styles.notificationTime}>
                        {formatDate(notification.enviada_em)}
                      </Text>
                    </View>

                    {/* Botão de Excluir */}
                    <IconButton
                      icon="close"
                      size={20}
                      iconColor="#999999"
                      onPress={() => handleDelete(notification.id)}
                      style={styles.deleteButton}
                    />
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerBadge: {
    backgroundColor: '#F44336',
    color: '#FFFFFF',
  },
  markAllText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  notificationUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#0066CC',
  },
  cardContent: {
    padding: 12,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0066CC',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999999',
  },
  deleteButton: {
    margin: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },
  notAuthContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  notAuthText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 32,
  },
});

