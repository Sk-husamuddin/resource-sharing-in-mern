import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { lostFoundApi, claimApi, messageApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const LostFoundDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // "I Have Found It" response form for lost items
  const [foundForm, setFoundForm] = useState({
    foundLocation: '',
    contactInfo: '',
    message: '',
  });
  const [foundSending, setFoundSending] = useState(false);
  const [foundSuccess, setFoundSuccess] = useState('');
  const [foundError, setFoundError] = useState('');
  const [showFoundForm, setShowFoundForm] = useState(false);

  // "I Lost This / Claim" form for found items
  const [claimForm, setClaimForm] = useState({
    verificationDetails: '',
    preferredPickupTime: '',
    message: '',
  });
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState('');
  const [claimError, setClaimError] = useState('');
  const [showClaimForm, setShowClaimForm] = useState(false);

  useEffect(() => {
    lostFoundApi.getOne(id)
      .then(res => setItem(res.data.item))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await lostFoundApi.remove(id);
      navigate('/lost-found');
    } catch (err) {
      alert(err.message);
    }
  };

  // Submit "I Have Found It" message to the owner who lost the item
  const handleFoundSubmit = async (e) => {
    e.preventDefault();
    setFoundError('');
    setFoundSending(true);
    try {
      const messageContent = [
        `🎉 [I Have Found Your Lost Item!]`,
        `Item: ${item.title}`,
        `Where/When Found: ${foundForm.foundLocation || 'Not specified'}`,
        foundForm.contactInfo ? `Contact/Handover Info: ${foundForm.contactInfo}` : null,
        `Details & Message: ${foundForm.message}`,
      ].filter(Boolean).join('\n\n');

      await messageApi.send({
        recipient: item.reporter._id,
        content: messageContent,
        relatedLostFound: id,
      });

      setFoundSuccess('Message sent! The person who lost this item has been notified.');
      setFoundForm({ foundLocation: '', contactInfo: '', message: '' });
    } catch (err) {
      setFoundError(err.message);
    } finally {
      setFoundSending(false);
    }
  };

  // Submit "I Lost This / Claim" to the finder
  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    setClaimError('');
    setClaimLoading(true);
    try {
      try {
        await claimApi.create({
          item: id,
          verificationDetails: claimForm.verificationDetails,
          preferredPickupTime: claimForm.preferredPickupTime || 'Flexible',
        });
      } catch (claimErr) {
        console.warn('Claim record note:', claimErr.message);
      }

      const messageContent = [
        `🙋 [I Lost This Item / Claim Request]`,
        `Item: ${item.title}`,
        `Ownership Proof / Verification: ${claimForm.verificationDetails}`,
        claimForm.preferredPickupTime ? `Preferred Pickup: ${claimForm.preferredPickupTime}` : null,
        claimForm.message ? `Message: ${claimForm.message}` : null,
      ].filter(Boolean).join('\n\n');

      await messageApi.send({
        recipient: item.reporter._id,
        content: messageContent,
        relatedLostFound: id,
      });

      setClaimSuccess('Claim and message submitted! The person who found this item has been notified.');
      setClaimForm({ verificationDetails: '', preferredPickupTime: '', message: '' });
    } catch (err) {
      setClaimError(err.message);
    } finally {
      setClaimLoading(false);
    }
  };

  // Mark as Claimed by reporter
  const handleMarkClaimed = async () => {
    if (!window.confirm('Mark this item as Claimed? It will now be listed in the Claimed section.')) return;
    try {
      const res = await lostFoundApi.update(id, { status: 'claimed' });
      setItem(res.data.item);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReopen = async () => {
    try {
      const res = await lostFoundApi.update(id, { status: 'open' });
      setItem(res.data.item);
    } catch (err) {
      alert(err.message);
    }
  };

  const isOwner = Boolean(user?._id && item?.reporter?._id && String(user._id) === String(item.reporter._id));
  const isAdmin = user?.role === 'admin';
  const isOpen = item?.status === 'open';
  const isClaimed = item?.status === 'claimed';

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (error) return <div className="error-page"><div className="alert alert-error">{error}</div><Link to="/lost-found">← Back</Link></div>;

  return (
    <div className="app-layout">
      <Header />
      <div className="main-container">
        <Sidebar />
        <main className="main-content">
          <div className="content-header">
            <h1 className="page-title">{item.title}</h1>
            <div className="header-actions">
              {/* Reporter: Mark as Claimed action */}
              {isOwner && !isClaimed && (
                <button
                  type="button"
                  onClick={handleMarkClaimed}
                  className="btn btn-claim-action"
                  title="Mark this item as Claimed/Resolved"
                >
                  ✅ Mark as Claimed
                </button>
              )}
              {isOwner && isClaimed && (
                <button
                  type="button"
                  onClick={handleReopen}
                  className="btn btn-secondary"
                  title="Reopen report"
                >
                  🔄 Reopen
                </button>
              )}

              {/* Strictly only the original reporter can edit */}
              {isOwner && (
                <Link to={`/lost-found/${id}/edit`} className="btn btn-secondary">✏️ Edit</Link>
              )}
              {/* Reporter or admin can delete */}
              {(isOwner || isAdmin) && (
                <button onClick={handleDelete} className="btn btn-danger">🗑️ Delete</button>
              )}
            </div>
          </div>

          {/* Claimed Status Banner */}
          {isClaimed && (
            <div className="claimed-banner" style={{ margin: '0 0 20px', padding: '16px 20px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '26px' }}>🎉</span>
                <div>
                  <strong style={{ color: '#166534', fontSize: '15px', display: 'block' }}>This item has been Claimed &amp; Resolved!</strong>
                  <span style={{ color: '#15803d', fontSize: '13px' }}>It is now listed in the Claimed section.</span>
                </div>
              </div>
              <Link to="/claims" className="btn-sm btn-primary" style={{ textDecoration: 'none' }}>
                View in Claims Section →
              </Link>
            </div>
          )}

          <div className="detail-card">
            <div className="detail-image">
              <img src={item.imageUrl || (item.reportType === 'found' ? '/loupe.png' : '/key.png')} alt={item.title} />
              <span className={`status-badge status-badge-lg ${item.reportType}`}>{item.reportType.toUpperCase()}</span>
            </div>
            <div className="detail-info">
              <div className="badges-row">
                <span className={`badge badge-status badge-${item.status}`}>{item.status}</span>
              </div>
              <p className="detail-desc">{item.description}</p>
              <p className="detail-meta">📍 <strong>Location:</strong> {item.location}</p>
              <p className="detail-meta">📅 <strong>Date:</strong> {new Date(item.incidentDate).toLocaleDateString()}</p>
              <p className="detail-meta">👤 <strong>Reported by:</strong> {item.reporter?.username || 'Unknown'}</p>
              <p className="detail-meta">🕒 <strong>Posted:</strong> {new Date(item.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Action Trigger Banner for other users when item is open */}
          {user && !isOwner && isOpen && (
            <div className="report-action-card" style={{ margin: '20px 0', padding: '18px 24px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                  {item.reportType === 'lost'
                    ? 'Did you find this item?'
                    : 'Is this item yours?'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
                  {item.reportType === 'lost'
                    ? `Let ${item.reporter?.username || 'the owner'} know you have their item and coordinate return.`
                    : `Contact ${item.reporter?.username || 'the finder'} with proof of ownership to claim it.`}
                </p>
              </div>
              <button
                className={`btn ${item.reportType === 'lost' ? 'btn-found-it' : 'btn-lost-it'}`}
                style={{ fontSize: '15px', padding: '10px 20px', fontWeight: 600 }}
                onClick={() => {
                  if (item.reportType === 'lost') {
                    setShowFoundForm(prev => !prev);
                  } else {
                    setShowClaimForm(prev => !prev);
                  }
                }}
              >
                {item.reportType === 'lost'
                  ? (showFoundForm ? '✕ Close Form' : '🔍 I Have Found It!')
                  : (showClaimForm ? '✕ Close Form' : '🙋 I Lost This / This Is Mine!')}
              </button>
            </div>
          )}

          {/* "I Have Found It" Form for LOST items */}
          {user && !isOwner && item.reportType === 'lost' && (showFoundForm || foundSuccess) && (
            <div className="claim-section" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <h2>🔍 I Have Found This Item</h2>
              <p style={{ color: '#166534', marginBottom: '16px', fontSize: '14px' }}>
                Fill out the response form below to notify <strong>{item.reporter?.username}</strong> where their item is and how they can get it back.
              </p>

              {foundSuccess && (
                <div className="alert alert-success">
                  <p>{foundSuccess}</p>
                  <div style={{ marginTop: '10px' }}>
                    <Link to="/messages" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                      💬 View in Messages
                    </Link>
                  </div>
                </div>
              )}

              {foundError && <div className="alert alert-error">{foundError}</div>}

              {!foundSuccess && (
                <form onSubmit={handleFoundSubmit} className="claim-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="foundLocation">
                      Where &amp; when did you find it? *
                    </label>
                    <input
                      id="foundLocation"
                      className="form-input"
                      placeholder="e.g., Campus library 2nd floor, yesterday around 4 PM"
                      value={foundForm.foundLocation}
                      onChange={e => setFoundForm(f => ({ ...f, foundLocation: e.target.value }))}
                      required
                      maxLength={200}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="foundDetails">
                      Details &amp; Handover Instructions *
                    </label>
                    <textarea
                      id="foundDetails"
                      className="form-input"
                      rows={4}
                      placeholder="Describe item condition or where the owner can meet you to retrieve it…"
                      value={foundForm.message}
                      onChange={e => setFoundForm(f => ({ ...f, message: e.target.value }))}
                      required
                      maxLength={2000}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contactInfo">
                      Your Contact / Phone / Email (Optional)
                    </label>
                    <input
                      id="contactInfo"
                      className="form-input"
                      placeholder="e.g., Phone number or desk location"
                      value={foundForm.contactInfo}
                      onChange={e => setFoundForm(f => ({ ...f, contactInfo: e.target.value }))}
                      maxLength={200}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary" disabled={foundSending}>
                      {foundSending ? 'Sending…' : '📨 Send Message to Owner'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowFoundForm(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* "I Lost This / Claim" Form for FOUND items */}
          {user && !isOwner && item.reportType === 'found' && (showClaimForm || claimSuccess) && (
            <div className="claim-section" style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}>
              <h2>🙋 Claim This Item / This Is Mine</h2>
              <p style={{ color: '#475569', marginBottom: '16px', fontSize: '14px' }}>
                Send your ownership proof and pickup preference to <strong>{item.reporter?.username}</strong>.
              </p>

              {claimSuccess && (
                <div className="alert alert-success">
                  <p>{claimSuccess}</p>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <Link to="/claims" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                      📋 View in My Claims
                    </Link>
                    <Link to="/messages" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                      💬 Open Messages
                    </Link>
                  </div>
                </div>
              )}

              {claimError && <div className="alert alert-error">{claimError}</div>}

              {!claimSuccess && (
                <form onSubmit={handleClaimSubmit} className="claim-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="verificationDetails">
                      Ownership Proof &amp; Verification Details *
                      <small> (Describe identifying details, unique markings, or contents only the true owner would know)</small>
                    </label>
                    <textarea
                      id="verificationDetails"
                      className="form-input"
                      rows={4}
                      placeholder="Describe unique details that prove this item belongs to you…"
                      value={claimForm.verificationDetails}
                      onChange={e => setClaimForm(f => ({ ...f, verificationDetails: e.target.value }))}
                      required
                      maxLength={500}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="pickupTime">
                      Preferred Pickup Time &amp; Location
                    </label>
                    <input
                      id="pickupTime"
                      className="form-input"
                      placeholder="e.g. Weekdays after 4pm at the Student Center"
                      value={claimForm.preferredPickupTime}
                      onChange={e => setClaimForm(f => ({ ...f, preferredPickupTime: e.target.value }))}
                      maxLength={200}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="claimMsg">
                      Message to Finder (Optional)
                    </label>
                    <textarea
                      id="claimMsg"
                      className="form-input"
                      rows={2}
                      placeholder="Any additional information or greetings to the person who found your item…"
                      value={claimForm.message}
                      onChange={e => setClaimForm(f => ({ ...f, message: e.target.value }))}
                      maxLength={1000}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary" disabled={claimLoading}>
                      {claimLoading ? 'Submitting…' : '📨 Submit Claim & Message Finder'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowClaimForm(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <Link to="/lost-found" className="back-link">← Back to Lost &amp; Found</Link>
        </main>
      </div>
    </div>
  );
};

export default LostFoundDetail;
