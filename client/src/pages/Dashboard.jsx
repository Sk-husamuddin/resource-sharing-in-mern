import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const Dashboard = () => {
  const { user } = useAuth();

  const categories = [
    { label: 'Study Materials', to: '/resources/study-materials', img: '/people.png', desc: 'Share and find study resources' },
    { label: 'Tools & Equipment', to: '/resources/tools-equipment', img: '/menu-img.png', desc: 'Borrow and lend tools' },
    { label: 'Books & Notes', to: '/resources/books-notes', img: '/shopping-cart.png', desc: 'Exchange educational materials' },
    { label: 'All Resources', to: '/resources', img: '/loupe.png', desc: 'Browse all available resources' },
  ];

  return (
    <div className="app-layout">
      <Header />
      <div className="main-container">
        <Sidebar />
        <main className="main-content">
          <div className="content-header">
            <h1 className="page-title">Resource Sharing</h1>
            <Link to="/resources/new" className="upload-btn">+ Upload Resource</Link>
          </div>

          <p className="welcome-msg">Welcome back, <strong>{user?.username}</strong>! 👋</p>

          <div className="resource-grid">
            {categories.map(({ label, to, img, desc }) => (
              <Link to={to} key={label} className="resource-card-link">
                <div className="resource-card">
                  <div className="card-image">
                    <img src={img} alt={label} />
                  </div>
                  <h3>{label}</h3>
                  <p>{desc}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="quick-links">
            <Link to="/lost-found" className="quick-link-card">
              <span>🔍</span>
              <div>
                <h4>Lost &amp; Found</h4>
                <p>Report or browse lost/found items</p>
              </div>
            </Link>
            <Link to="/claims" className="quick-link-card">
              <span>📋</span>
              <div>
                <h4>My Claims</h4>
                <p>Track your claim submissions</p>
              </div>
            </Link>
            <Link to="/messages" className="quick-link-card">
              <span>💬</span>
              <div>
                <h4>Messages</h4>
                <p>View your conversations</p>
              </div>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
