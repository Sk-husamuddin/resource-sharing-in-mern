import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/dashboard');
  }, [user, loading, navigate]);

  return (
    <div className="welcome-page">
      <header className="header header-welcome">
        <div className="logo-div">
          <h2 className="logo-text">🔗 Resource Hub</h2>
        </div>
        <div className="right-section">
          <Link to="/login" className="get-cls">Sign In</Link>
          <Link to="/signup" className="button-cls">Join Now</Link>
        </div>
      </header>

      <div className="mb">
        <div className="mh-div">
          <h1 className="mh">Welcome to Resource and Sharing HUB</h1>
        </div>
        <p className="tagline">Share, borrow and find resources in your community</p>
        <div className="body-buttons">
          <Link to="/login" className="button-cls body-btn">Sign In</Link>
          <Link to="/signup" className="get-cls body-btn">Join Now</Link>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">📚</span>
            <h3>Share Resources</h3>
            <p>Upload study materials, books, tools and more for your community</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🔍</span>
            <h3>Lost &amp; Found</h3>
            <p>Report lost items or help others find what they're missing</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🤝</span>
            <h3>Connect</h3>
            <p>Message resource owners and coordinate pickups directly</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
