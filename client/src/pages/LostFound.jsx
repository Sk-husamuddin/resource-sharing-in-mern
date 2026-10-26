import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lostFoundApi, messageApi, claimApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const ITEM_IMGS = { lost: '/key.png', found: '/loupe.png' };

const LostFound = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Response form state
  const [contactForm, setContactForm] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page };
      if (typeFilter) params.reportType = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await lostFoundApi.getAll(params);
      setItems(res.data.items || []);
      setPages(res.data.pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, page, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (page === 1) fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await lostFoundApi.remove(id);
      setItems(prev => prev.filter(i => i._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkClaimed = async (id) => {
    if (!window.confirm('Mark this item as Claimed? It will now be shown in the Claimed section.')) return;
    try {
      await lostFoundApi.update(id, { status: 'claimed' });
      setItems(prev => prev.map(i => i._id === id ? { ...i, status: 'claimed' } : i));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReopen = async (id) => {
    try {
      await lostFoundApi.update(id, { status: 'open' });
      setItems(prev => prev.map(i => i._id === id ? { ...i, status: 'open' } : i));
    } catch (err) {
      alert(err.message);
    }
  };

  // Open response/message form for a given item
  const openContactForm = (item) => {
    setContactForm({
      itemId: item._id,
      itemTitle: item.title,
      reporterId: item.reporter?._id,
      reporterName: item.reporter?.username || 'the reporter',
      reportType: item.reportType,
      foundLocation: '',
      contactInfo: '',
      verificationDetails: '',
      preferredPickupTime: '',
      message: '',
      sending: false,
      sent: false,
      error: '',
    });
  };

  const handleContactSend = async (e) => {
    e.preventDefault();
    if (!contactForm) return;
    setContactForm(f => ({ ...f, sending: true, error: '' }));
    try {
      let messageContent = '';

      if (contactForm.reportType === 'lost') {
        messageContent = [
          `🎉 [I Have Found Your Lost Item!]`,
          `Item: ${contactForm.itemTitle}`,
          `Where/When Found: ${contactForm.foundLocation || 'Not specified'}`,
          contactForm.contactInfo ? `Contact/Handover: ${contactForm.contactInfo}` : null,
          `Details & Message: ${contactForm.message}`,
        ].filter(Boolean).join('\n\n');
      } else {
        try {
          await claimApi.create({
            item: contactForm.itemId,
            verificationDetails: contactForm.verificationDetails,
            preferredPickupTime: contactForm.preferredPickupTime || 'Flexible',
          });
        } catch (claimErr) {
          console.warn('Claim record note:', claimErr.message);
        }

        messageContent = [
          `🙋 [I Lost This Item / Claim Request]`,
          `Item: ${contactForm.itemTitle}`,
          `Ownership Proof / Details: ${contactForm.verificationDetails}`,
          contactForm.preferredPickupTime ? `Preferred Pickup: ${contactForm.preferredPickupTime}` : null,
          contactForm.message ? `Message: ${contactForm.message}` : null,
        ].filter(Boolean).join('\n\n');
      }

      await messageApi.send({
        recipient: contactForm.reporterId,
        content: messageContent,
        relatedLostFound: contactForm.itemId,
      });
      setContactForm(f => ({ ...f, sent: true, sending: false }));
    } catch (err) {
      setContactForm(f => ({ ...f, error: err.message, sending: false }));
    }
  };

  return (
    <div className="app-layout">
      <Header />
      <div className="main-container">
        <Sidebar />
        <main className="main-content">
          <div className="content-header">
            <h1 className="page-title">Lost &amp; Found</h1>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link to="/claims" className="btn btn-secondary">📋 My Claims Section</Link>
              {user && <Link to="/lost-found/new" className="report-btn">+ Report Item</Link>}
            </div>
          </div>

          {/* Quick Filter Tabs including Claimed Section */}
          <div className="filter-tabs" style={{ marginBottom: '16px' }}>
            <button
              className={`tab-btn ${!statusFilter ? 'active' : ''}`}
              onClick={() => { setStatusFilter(''); setPage(1); }}
            >
              All Items
            </button>
            <button
              className={`tab-btn ${statusFilter === 'open' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('open'); setPage(1); }}
            >
              Open Items
            </button>
            <button
              className={`tab-btn ${statusFilter === 'claimed' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('claimed'); setPage(1); }}
            >
              ✨ Claimed Section
            </button>
          </div>

          <div className="search-filter-bar">
            <form onSubmit={handleSearch} className="search-box">
              <input className="search-input" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
              <button type="submit" className="search-btn">
                <img src="/loupe.png" alt="Search" className="search-icon" />
              </button>
            </form>
            <select className="filter-select" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
            <select className="filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="claimed">Claimed</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {loading && <div className="loading-state"><div className="spinner" /> Loading…</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="empty-state">
              <span>{statusFilter === 'claimed' ? '🎉' : '🔍'}</span>
              <p>{statusFilter === 'claimed' ? 'No claimed items yet.' : 'No items found.'}</p>
            </div>
          )}

          {!loading && (
            <div className="items-grid">
              {items.map(item => {
                const isOwner = Boolean(user?._id && item.reporter?._id && String(user._id) === String(item.reporter._id));
                const isAdmin = user?.role === 'admin';
                const isOpen = item.status === 'open';
                const isClaimed = item.status === 'claimed';
                const showContactBtn = user && !isOwner && isOpen;
                const isContactOpen = contactForm?.itemId === item._id;

                return (
                  <div key={item._id} className={`item-card ${item.reportType} ${isClaimed ? 'is-claimed-card' : ''}`}>
                    <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px', zIndex: 2 }}>
                      <span className={`status-badge ${item.reportType}`}>{item.reportType}</span>
                      {isClaimed && (
                        <span className="status-badge claimed-tag" style={{ background: '#16a34a', color: 'white' }}>✓ Claimed</span>
                      )}
                    </div>
                    <div className="item-image">
                      <img src={item.imageUrl || ITEM_IMGS[item.reportType]} alt={item.title} />
                    </div>
                    <div className="item-details">
                      <h3>{item.title}</h3>
                      <p className="item-description">
                        {item.description.substring(0, 100)}{item.description.length > 100 ? '…' : ''}
                      </p>
                      <div className="item-meta">
                        <span className="location">📍 {item.location}</span>
                        <span className="date">📅 {new Date(item.incidentDate).toLocaleDateString()}</span>
                        <span className="reporter">👤 {item.reporter?.username || 'Unknown'}</span>
                      </div>

                      <div className="item-actions">
                        <Link to={`/lost-found/${item._id}`} className="btn-sm btn-primary">
                          View Details
                        </Link>

                        {/* "I Have Found It!" for lost items / "I Lost This!" for found items */}
                        {showContactBtn && (
                          <button
                            className={`btn-sm ${item.reportType === 'lost' ? 'btn-found-it' : 'btn-lost-it'}`}
                            onClick={() => isContactOpen
                              ? setContactForm(null)
                              : openContactForm(item)
                            }
                          >
                            {item.reportType === 'lost'
                              ? (isContactOpen ? '✕ Close' : '🔍 I Have Found It!')
                              : (isContactOpen ? '✕ Close' : '🙋 I Lost This!')}
                          </button>
                        )}

                        {/* Reporter: Mark as Claimed action */}
                        {isOwner && !isClaimed && (
                          <button
                            onClick={() => handleMarkClaimed(item._id)}
                            className="btn-sm btn-claim-action"
                            title="Mark this item as Claimed/Returned"
                          >
                            ✅ Claimed
                          </button>
                        )}
                        {isOwner && isClaimed && (
                          <button
                            onClick={() => handleReopen(item._id)}
                            className="btn-sm btn-secondary"
                            title="Reopen report"
                          >
                            🔄 Reopen
                          </button>
                        )}

                        {/* Strictly the reporter can edit */}
                        {isOwner && (
                          <Link to={`/lost-found/${item._id}/edit`} className="btn-sm btn-secondary">Edit</Link>
                        )}

                        {/* Reporter or admin can delete */}
                        {(isOwner || isAdmin) && (
                          <button onClick={() => handleDelete(item._id)} className="btn-sm btn-danger">Delete</button>
                        )}
                      </div>

                      {/* Response Form */}
                      {isContactOpen && (
                        <div className="inline-contact-form">
                          {contactForm.sent ? (
                            <div className="alert alert-success" style={{ marginTop: '10px' }}>
                              <p>✅ {item.reportType === 'lost' ? 'Message sent! The person who lost this item has been notified.' : 'Claim & message sent! The person who found this item has been notified.'}</p>
                              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                <Link to="/messages" className="btn-sm btn-primary">💬 Open Messages</Link>
                                {item.reportType === 'found' && (
                                  <Link to="/claims" className="btn-sm btn-secondary">📋 View Claims</Link>
                                )}
                              </div>
                            </div>
                          ) : (
                            <form onSubmit={handleContactSend} className="response-form-inner">
                              <h4 style={{ margin: '8px 0 6px', color: '#1f2937', fontSize: '13px', fontWeight: 'bold' }}>
                                {item.reportType === 'lost'
                                  ? `🔍 Let ${contactForm.reporterName} know you found their item:`
                                  : `🙋 Let ${contactForm.reporterName} know this is your item:`}
                              </h4>

                              {contactForm.error && (
                                <div className="alert alert-error" style={{ margin: '6px 0' }}>{contactForm.error}</div>
                              )}

                              {item.reportType === 'lost' ? (
                                <>
                                  <div style={{ marginBottom: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                      Where &amp; when did you find it? *
                                    </label>
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="e.g., Campus library 2nd floor, yesterday at 4 PM"
                                      value={contactForm.foundLocation}
                                      onChange={e => setContactForm(f => ({ ...f, foundLocation: e.target.value }))}
                                      required
                                      maxLength={200}
                                    />
                                  </div>

                                  <div style={{ marginBottom: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                      Details &amp; Handover Instructions *
                                    </label>
                                    <textarea
                                      className="form-input"
                                      rows={2}
                                      placeholder="Describe item condition or where they can meet you to retrieve it…"
                                      value={contactForm.message}
                                      onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                                      required
                                      maxLength={2000}
                                    />
                                  </div>

                                  <div style={{ marginBottom: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                      Your Contact / Phone / Handover note (Optional)
                                    </label>
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="e.g. Phone number or desk location"
                                      value={contactForm.contactInfo}
                                      onChange={e => setContactForm(f => ({ ...f, contactInfo: e.target.value }))}
                                      maxLength={200}
                                    />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ marginBottom: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                      Ownership Proof / Verification Details *
                                    </label>
                                    <textarea
                                      className="form-input"
                                      rows={2}
                                      placeholder="Describe identifying details that prove it is yours (e.g., contents, color, marks, wallpaper)…"
                                      value={contactForm.verificationDetails}
                                      onChange={e => setContactForm(f => ({ ...f, verificationDetails: e.target.value }))}
                                      required
                                      maxLength={500}
                                    />
                                  </div>

                                  <div style={{ marginBottom: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                      Preferred Pickup Time &amp; Location
                                    </label>
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="e.g. Weekdays after 4pm at Student Center"
                                      value={contactForm.preferredPickupTime}
                                      onChange={e => setContactForm(f => ({ ...f, preferredPickupTime: e.target.value }))}
                                      maxLength={200}
                                    />
                                  </div>

                                  <div style={{ marginBottom: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                      Message to Finder (Optional)
                                    </label>
                                    <textarea
                                      className="form-input"
                                      rows={2}
                                      placeholder="Any additional message to the person who found it…"
                                      value={contactForm.message}
                                      onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                                      maxLength={1000}
                                    />
                                  </div>
                                </>
                              )}

                              <div className="inline-form-actions">
                                <button
                                  type="submit"
                                  className="btn-sm btn-primary"
                                  disabled={contactForm.sending}
                                >
                                  {contactForm.sending ? 'Sending…' : (item.reportType === 'lost' ? '📨 Send to Owner' : '📨 Submit Claim & Send')}
                                </button>
                                <button
                                  type="button"
                                  className="btn-sm btn-secondary"
                                  onClick={() => setContactForm(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-sm btn-secondary">← Prev</button>
              <span>Page {page} of {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-sm btn-secondary">Next →</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default LostFound;
