import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { messageApi } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?._id) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    try {
      // Fetch both unread count and latest messages to populate dropdown
      const [countRes, messagesRes] = await Promise.all([
        messageApi.getUnreadCount(),
        messageApi.getAll(),
      ]);

      const count = countRes.data.unreadCount || 0;
      setUnreadCount(count);

      // Filter incoming unread messages for notification dropdown
      const allMessages = messagesRes.data.messages || [];
      const incomingUnread = allMessages.filter(
        (m) => m.recipient?._id === user._id && !m.isRead
      );
      setNotifications(incomingUnread);
    } catch (err) {
      // Fail silently in background polling
      console.debug('[Notifications polling error]:', err.message);
    }
  }, [user?._id]);

  // Initial fetch and periodic polling (every 10 seconds)
  useEffect(() => {
    if (!user?._id) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);

    const onFocus = () => fetchNotifications();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?._id, fetchNotifications]);

  const markAsRead = useCallback(async (messageId) => {
    try {
      await messageApi.markRead(messageId);
      setNotifications((prev) => prev.filter((m) => m._id !== messageId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[Error marking notification read]:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await Promise.all(notifications.map((m) => messageApi.markRead(m._id)));
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('[Error marking all notifications read]:', err);
    }
  }, [notifications]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        loading,
        refreshNotifications: fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
};
