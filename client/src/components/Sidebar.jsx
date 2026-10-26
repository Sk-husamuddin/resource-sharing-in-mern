import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const Sidebar = () => {
  const { isAdmin } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <aside className="sidebar">
      <div className="icon-container">
        <NavLink to="/dashboard" className={({ isActive }) => `icon-item-link${isActive ? ' active' : ''}`}>
          <div className="icon-item">
            <img src="/shopping-cart.png" alt="Resources" className="nav-icon" />
            <span className="icon-label">Resources</span>
          </div>
        </NavLink>

        <NavLink to="/lost-found" className={({ isActive }) => `icon-item-link${isActive ? ' active' : ''}`}>
          <div className="icon-item">
            <img src="/key.png" alt="Lost & Found" className="nav-icon" />
            <span className="icon-label">Lost &amp; Found</span>
          </div>
        </NavLink>

        <NavLink to="/claims" className={({ isActive }) => `icon-item-link${isActive ? ' active' : ''}`}>
          <div className="icon-item">
            <img src="/loupe.png" alt="My Claims" className="nav-icon" />
            <span className="icon-label">My Claims</span>
          </div>
        </NavLink>

        <NavLink to="/messages" className={({ isActive }) => `icon-item-link${isActive ? ' active' : ''}`}>
          <div className="icon-item" style={{ position: 'relative' }}>
            <img src="/menu-img.png" alt="Messages" className="nav-icon" />
            {unreadCount > 0 && (
              <span className="sidebar-notification-dot" title={`${unreadCount} unread message(s)`}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <span className="icon-label">Messages</span>
          </div>
        </NavLink>

        <NavLink to="/profile" className={({ isActive }) => `icon-item-link${isActive ? ' active' : ''}`}>
          <div className="icon-item">
            <img src="/people.png" alt="Profile" className="nav-icon" />
            <span className="icon-label">Profile</span>
          </div>
        </NavLink>

        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `icon-item-link${isActive ? ' active' : ''}`}>
            <div className="icon-item icon-item-admin">
              <span className="nav-icon" style={{ fontSize: '30px' }}>🛡️</span>
              <span className="icon-label">Admin</span>
            </div>
          </NavLink>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
