import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { claimApi, lostFoundApi } from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const Claims = () => {
  const [tab, setTab] = useState('claimed-items'); // 'claimed-items', 'received-claims', 'my-claims'
  const [claimedItems, setClaimedItems] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [receivedClaims, setReceivedClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [claimedRes, myClaimsRes, receivedClaimsRes] = await Promise.all([
        lostFoundApi.getAll({ status: 'claimed', limit: 50 }),
        claimApi.getAll(),
        claimApi.getAll({ type: 'received' }),
      ]);

      setClaimedItems(claimedRes.data.items || []);
      setMyClaims(myClaimsRes.data.claims || []);
      setReceivedClaims(receivedClaimsRes.data.claims || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWithdraw = async (id) => {
    if (!window.confirm('Are you sure you want to withdraw this claim?')) return;
    try {
      await claimApi.remove(id);
      setActionMsg('Claim successfully withdrawn.');
      setMyClaims((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReviewClaim = async (claimId, newStatus) => {
    const actionLabel = newStatus === 'approved' ? 'Approve & mark item as Claimed' : 'Reject';
    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) return;

    try {
      await claimApi.updateStatus(claimId, { status: newStatus });
      setActionMsg(`Claim ${newStatus === 'approved' ? 'approved! Item marked as Claimed.' : 'rejected.'}`);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app-layout">
      <Header />
      <div className="main-container">
        <Sidebar />
        <main className="main-content">
          <div className="content-header">
            <div>
              <h1 className="page-title">Claims &amp; Claimed Section</h1>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>
                Track items marked as claimed, reviews on your reports, and your submitted claims.
              </p>
            </div>
            <Link to="/lost-found" className="report-btn">
              Browse Lost &amp; Found
            </Link>
          </div>

          {/* Section Navigation Tabs */}
          <div className="filter-tabs" style={{ marginBottom: '20px' }}>
            <button
              className={`tab-btn ${tab === 'claimed-items' ? 'active' : ''}`}
              onClick={() => setTab('claimed-items')}
            >
              🎉 Claimed Items ({claimedItems.length})
            </button>
            <button
              className={`tab-btn ${tab === 'received-claims' ? 'active' : ''}`}
              onClick={() => setTab('received-claims')}
            >
              📬 Claims on My Reports ({receivedClaims.length})
            </button>
            <button
              className={`tab-btn ${tab === 'my-claims' ? 'active' : ''}`}
              onClick={() => setTab('my-claims')}
            >
              🙋 My Submitted Claims ({myClaims.length})
            </button>
          </div>

          {actionMsg && <div className="alert alert-success">{actionMsg}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {loading && (
            <div className="loading-state">
              <div className="spinner" /> Loading section data…
            </div>
          )}

          {/* 1. CLAIMED ITEMS SECTION */}
          {!loading && tab === 'claimed-items' && (
            <>
              {claimedItems.length === 0 ? (
                <div className="empty-state">
                  <span>🎉</span>
                  <p>No items have been claimed yet.</p>
                  <small style={{ color: '#94a3b8' }}>
                    When a reporter marks an item as "Claimed", it will automatically appear here.
                  </small>
                  <Link to="/lost-found" className="btn btn-primary" style={{ marginTop: '16px' }}>
                    Browse Lost &amp; Found
                  </Link>
                </div>
              ) : (
                <div className="items-grid">
                  {claimedItems.map((item) => (
                    <div key={item._id} className={`item-card ${item.reportType} is-claimed-card`}>
                      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px', zIndex: 2 }}>
                        <span className={`status-badge ${item.reportType}`}>{item.reportType}</span>
                        <span className="status-badge claimed-tag">✓ Claimed</span>
                      </div>
                      <div className="item-image">
                        <img src={item.imageUrl || (item.reportType === 'found' ? '/loupe.png' : '/key.png')} alt={item.title} />
                      </div>
                      <div className="item-details">
                        <h3>{item.title}</h3>
                        <p className="item-description">
                          {item.description.substring(0, 100)}{item.description.length > 100 ? '…' : ''}
                        </p>
                        <div className="item-meta">
                          <span className="location">📍 {item.location}</span>
                          <span className="date">📅 {new Date(item.incidentDate).toLocaleDateString()}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>
                          Reported by: <strong>{item.reporter?.username || 'Unknown'}</strong>
                        </p>
                        <div className="item-actions">
                          <Link to={`/lost-found/${item._id}`} className="btn-sm btn-primary">
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 2. CLAIMS RECEIVED ON MY REPORTS */}
          {!loading && tab === 'received-claims' && (
            <>
              {receivedClaims.length === 0 ? (
                <div className="empty-state">
                  <span>📬</span>
                  <p>No claims received on your reported items yet.</p>
                  <small style={{ color: '#94a3b8' }}>
                    When someone submits an ownership claim for an item you reported, it will appear here for your review.
                  </small>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Reported Item</th>
                        <th>Claimant</th>
                        <th>Verification Details</th>
                        <th>Pickup Preference</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receivedClaims.map((c) => (
                        <tr key={c._id}>
                          <td>
                            <strong>{c.item?.title || 'Unknown Item'}</strong>
                            {c.item && (
                              <div style={{ fontSize: '12px', marginTop: '2px' }}>
                                <Link to={`/lost-found/${c.item._id}`} className="table-link">
                                  View Item
                                </Link>
                              </div>
                            )}
                          </td>
                          <td>
                            <strong>{c.claimant?.displayName || c.claimant?.username}</strong>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>@{c.claimant?.username}</div>
                          </td>
                          <td style={{ maxWidth: '250px', fontSize: '13px' }}>
                            {c.verificationDetails || 'No details provided'}
                          </td>
                          <td>{c.preferredPickupTime || 'Flexible'}</td>
                          <td>
                            <span className={`status-badge badge-${c.status}`}>{c.status}</span>
                          </td>
                          <td>
                            {c.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => handleReviewClaim(c._id, 'approved')}
                                  className="btn-sm btn-claim-action"
                                  title="Approve claim and mark item as Claimed"
                                >
                                  ✅ Approve (Claimed)
                                </button>
                                <button
                                  onClick={() => handleReviewClaim(c._id, 'rejected')}
                                  className="btn-sm btn-danger"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '13px', color: '#64748b' }}>
                                {c.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* 3. MY SUBMITTED CLAIMS */}
          {!loading && tab === 'my-claims' && (
            <>
              {myClaims.length === 0 ? (
                <div className="empty-state">
                  <span>🙋</span>
                  <p>You haven't submitted any claims yet.</p>
                  <Link to="/lost-found" className="btn btn-primary" style={{ marginTop: '16px' }}>
                    Browse Lost &amp; Found
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Status</th>
                        <th>Pickup Preference</th>
                        <th>Date Submitted</th>
                        <th>Reviewed By</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myClaims.map((c) => (
                        <tr key={c._id}>
                          <td>
                            <strong>{c.item?.title || 'Unknown Item'}</strong>
                            {c.item && (
                              <div style={{ fontSize: '12px' }}>
                                <Link to={`/lost-found/${c.item._id}`} className="table-link">
                                  View Item
                                </Link>
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`status-badge badge-${c.status}`}>{c.status}</span>
                          </td>
                          <td>{c.preferredPickupTime || 'Not specified'}</td>
                          <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td>{c.reviewer?.username || 'Pending'}</td>
                          <td>
                            {c.status === 'pending' && (
                              <button
                                onClick={() => handleWithdraw(c._id)}
                                className="btn-sm btn-danger"
                              >
                                Withdraw
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Claims;
