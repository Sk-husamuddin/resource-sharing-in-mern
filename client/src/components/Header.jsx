import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useState, useRef, useEffect } from 'react';

const Header = () => {
  const { user, logout, isAdmin } = useAuth();
  const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);

  const isWelcomePage = location.pathname === '/';

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } finally {
      setLoggingOut(false);
    }
  };

  // Close notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setShowPanel(false);
      }
    };
    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPanel]);

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification._id);
    setShowPanel(false);
    navigate('/messages');
  };

  return (
    <header className={`header ${isWelcomePage ? 'header-welcome' : ''}`}>
      <div className="logo-div">
        <Link to={user ? '/dashboard' : '/'} className="logo-link">
          <h2 className="logo-text">🔗 Resource Hub</h2>
        </Link>
      </div>
      <div className="right-section">
        {user ? (
          <div className="user-info">
            {isAdmin && (
              <Link to="/admin" className="admin-link">Admin</Link>
            )}

            {/* Notification Bell & Panel */}
            <div className="notification-wrapper" ref={panelRef}>
              <button
                type="button"
                className={`notification-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={() => setShowPanel(prev => !prev)}
                title={unreadCount > 0 ? `${unreadCount} unread message(s)` : 'Notifications'}
                aria-label="Notifications"
              >
                <span className="bell-icon">🔔</span>
                {unreadCount > 0 && (
                  <span className="notification-badge-dot">
                    <span className="dot-pulse" />
                    <span className="dot-number">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showPanel && (
                <div className="notification-panel">
                  <div className="notification-panel-header">
                    <div className="panel-title-group">
                      <h4>Notifications</h4>
                      {unreadCount > 0 && (
                        <span className="unread-counter-tag">{unreadCount} new</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="mark-all-btn"
                        onClick={markAllAsRead}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="notification-panel-body">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">
                        <span className="empty-bell">✨</span>
                        <p>No new notifications</p>
                        <small>You're all caught up!</small>
                      </div>
                    ) : (
                      <div className="notification-list">
                        {notifications.map((n) => (
                          <div
                            key={n._id}
                            className="notification-item unread"
                            onClick={() => handleNotificationClick(n)}
                          >
                            <div className="notification-item-avatar">
                              {n.sender?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="notification-item-content">
                              <div className="item-sender-row">
                                <span className="sender-name">
                                  {n.sender?.displayName || n.sender?.username || 'Someone'}
                                </span>
                                <span className="item-time">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {n.relatedLostFound && (
                                <span className="notification-context-tag">
                                  🔍 {n.relatedLostFound.title}
                                </span>
                              )}
                              {n.relatedResource && (
                                <span className="notification-context-tag">
                                  📦 {n.relatedResource.title}
                                </span>
                              )}
                              <p className="notification-snippet">
                                {n.content.substring(0, 75)}{n.content.length > 75 ? '…' : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="item-read-check"
                              title="Mark read"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(n._id);
                              }}
                            >
                              ✓
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="notification-panel-footer">
                    <Link
                      to="/messages"
                      className="view-all-link"
                      onClick={() => setShowPanel(false)}
                    >
                      View all messages 💬
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link to="/profile" className="username-link">
              👤 {user.username}
            </Link>
            <button
              onClick={handleLogout}
              className="logout-btn"
              disabled={loggingOut}
            >
              {loggingOut ? 'Logging out…' : 'Logout'}
            </button>
          </div>
        ) : (
          <>
            <Link to="/login" className="get-cls">Sign In</Link>
            <Link to="/signup" className="button-cls">Join Now</Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
