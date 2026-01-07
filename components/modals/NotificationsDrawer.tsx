import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '@/lib/haptics';
import { useAuth } from '@/contexts/AuthContext';
import { getNotifications, markAllNotificationsAsRead, Notification } from '@/lib/notification_utils';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

interface NotificationsDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.9;
const DRAWER_MARGIN_TOP = 40;
const DRAWER_MARGIN_BOTTOM = 40;

export default function NotificationsDrawer({ visible, onClose }: NotificationsDrawerProps) {
  const { getUserProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-(SCREEN_WIDTH + DRAWER_WIDTH))).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      loadNotifications();
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -(SCREEN_WIDTH + DRAWER_WIDTH),
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const loadNotifications = async () => {
    const profile = await getUserProfile();
    if (!profile?.hash) return;

    setLoading(true);
    try {
      const notifs = await getNotifications(profile.hash);
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    const profile = await getUserProfile();
    if (!profile?.hash) return;

    triggerHaptic('medium');
    setMarkingAsRead(true);
    try {
      const result = await markAllNotificationsAsRead(profile.hash);
      if (result.ok) {
        await loadNotifications();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAsRead(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleClose = () => {
    triggerHaptic('light');
    onClose();
  };

  const formatNotificationTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>
        
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>NOTIFICATIONS</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </View>

          {unreadCount > 0 && (
            <View style={styles.markReadContainer}>
              <TouchableOpacity
                style={styles.markReadButton}
                onPress={handleMarkAllAsRead}
                disabled={markingAsRead}
              >
                {markingAsRead ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.markReadButtonText}>MARK ALL AS READ</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.notificationsList} contentContainerStyle={styles.notificationsContent}>
            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={styles.emptyStateText}>Loading notifications...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-outline" size={48} color="#999" />
                <Text style={styles.emptyStateText}>No notifications</Text>
                <Text style={styles.emptyStateSubtext}>You're all caught up!</Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <View
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.read && styles.notificationItemUnread,
                  ]}
                >
                  <View style={[
                    styles.notificationIcon,
                    !notification.read && styles.notificationIconUnread,
                  ]}>
                    <Ionicons name="notifications" size={20} color={notification.read ? "#666" : "#000"} />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={[
                      styles.notificationTitle,
                      !notification.read && styles.notificationTitleUnread,
                    ]}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationBody}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatNotificationTime(notification.created_at)}
                    </Text>
                  </View>
                  {!notification.read && (
                    <View style={styles.unreadIndicator} />
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: (SCREEN_WIDTH - DRAWER_WIDTH) / 2,
    top: DRAWER_MARGIN_TOP,
    bottom: DRAWER_MARGIN_BOTTOM,
    width: DRAWER_WIDTH,
    backgroundColor: '#f7f7f7',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    backgroundColor: '#fff',
  },
  drawerTitle: {
    fontSize: 18,
    fontFamily: fontFamily,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
  },
  markReadContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  markReadButton: {
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  markReadButtonText: {
    fontSize: 12,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  notificationsList: {
    flex: 1,
  },
  notificationsContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '400',
    color: '#666',
    marginTop: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  notificationItemUnread: {
    backgroundColor: '#FFF',
    borderColor: '#000',
    borderWidth: 2,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationIconUnread: {
    backgroundColor: '#000',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  notificationTitleUnread: {
    fontWeight: '800',
    color: '#000',
  },
  notificationBody: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '400',
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 11,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#999',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
});

