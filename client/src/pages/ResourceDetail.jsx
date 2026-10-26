import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { resourceApi, messageApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const CATEGORY_LABELS = {
  'study-materials': 'Study Materials',
  'books-notes': 'Books & Notes',
  'tools-equipment': 'Tools & Equipment',
  'other': 'Other',
};

const ResourceDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgSent, setMsgSent] = useState(false);
  const [msgError, setMsgError] = useState('');

  useEffect(() => {
    resourceApi.getOne(id)
      .then(res => setResource(res.data.resource))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this resource?')) return;
    try {
      await resourceApi.remove(id);
      navigate('/resources');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMessage = async (e) => {
    e.preventDefault();
    setMsgError('');
    try {
      await messageApi.send({ recipient: resource.owner._id, content: msgContent, relatedResource: id });
      setMsgSent(true);
      setMsgContent('');
    } catch (err) {
      setMsgError(err.message);
    }
  };

  const isOwner = Boolean(user?._id && resource?.owner?._id && String(user._id) === String(resource.owner._id));
  const isAdmin = user?.role === 'admin';

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (error) return <div className="error-page"><div className="alert alert-error">{error}</div><Link to="/resources">← Back</Link></div>;

  return (
    <div className="app-layout">
      <Header />
      <div className="main-container">
        <Sidebar />
        <main className="main-content">
          <div className="content-header">
            <h1 className="page-title">{resource.title}</h1>
            <div className="header-actions">
              {isOwner && (
                <Link to={`/resources/${id}/edit`} className="btn btn-secondary">✏️ Edit</Link>
              )}
              {(isOwner || isAdmin) && (
                <button onClick={handleDelete} className="btn btn-danger">🗑️ Delete</button>
              )}
            </div>
          </div>

          <div className="detail-card">
            <div className="detail-image">
              <img src={resource.imageUrl || '/people.png'} alt={resource.title} />
            </div>
            <div className="detail-info">
              <div className="badges-row">
                <span className="badge badge-category">{CATEGORY_LABELS[resource.category] || resource.category}</span>
                <span className={`badge badge-status badge-${resource.status}`}>{resource.status}</span>
              </div>
              <p className="detail-desc">{resource.description}</p>
              {resource.location && <p className="detail-meta">📍 <strong>Location:</strong> {resource.location}</p>}
              {resource.availabilityDetails && <p className="detail-meta">🕒 <strong>Availability:</strong> {resource.availabilityDetails}</p>}
              <p className="detail-meta">👤 <strong>Owner:</strong> {resource.owner?.username || 'Unknown'}</p>
              <p className="detail-meta">📅 <strong>Posted:</strong> {new Date(resource.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {user && !isOwner && (
            <div className="message-section">
              <h2>Contact Owner</h2>
              {msgSent && <div className="alert alert-success">Message sent successfully!</div>}
              {msgError && <div className="alert alert-error">{msgError}</div>}
              {!msgSent && (
                <form onSubmit={handleMessage} className="message-form">
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Write a message to the resource owner…"
                    value={msgContent}
                    onChange={e => setMsgContent(e.target.value)}
                    required
                    maxLength={2000}
                  />
                  <button type="submit" className="btn btn-primary">Send Message</button>
                </form>
              )}
            </div>
          )}

          <Link to="/resources" className="back-link">← Back to Resources</Link>
        </main>
      </div>
    </div>
  );
};

export default ResourceDetail;
