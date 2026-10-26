import { useState, useEffect } from 'react';
import { adminApi, claimApi, resourceApi, lostFoundApi } from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const Admin = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [resources, setResources] = useState([]);
  const [lostFound, setLostFound] = useState([]);
  const [tab, setTab] = useState('stats'); // 'stats', 'users', 'claims', 'resources', 'lost-found'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, usersRes, claimsRes, resRes, lfRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers({ limit: 50 }),
        adminApi.getClaims(),
        resourceApi.getAll({ limit: 50 }),
        lostFoundApi.getAll({ limit: 50 }),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || []);
      setClaims(claimsRes.data.claims || []);
      setResources(resRes.data.items || resRes.data.resources || []);
      setLostFound(lfRes.data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleRoleToggle = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change role of this user to ${newRole}?`)) return;
    try {
      await adminApi.updateUser(userId, { role: newRole });
      setSuccess(`User role updated to ${newRole}.`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClaimReview = async (claimId, status) => {
    try {
      await claimApi.updateStatus(claimId, { status });
      setSuccess(`Claim marked as ${status}.`);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteResource = async (id) => {
    if (!window.confirm('Moderator action: delete this resource?')) return;
    try {
      await adminApi.deleteResource(id);
      setSuccess('Resource deleted.');
      setResources((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteLostFound = async (id) => {
    if (!window.confirm('Moderator action: delete this lost/found report?')) return;
    try {
      await adminApi.deleteLostFound(id);
      setSuccess('Item report deleted.');
      setLostFound((prev) => prev.filter((i) => i._id !== id));
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
            <h1 className="page-title">🛡️ Admin Control Panel</h1>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Navigation Tabs */}
          <div className="filter-tabs" style={{ marginBottom: '24px' }}>
            <button
              className={`tab-btn ${tab === 'stats' ? 'active' : ''}`}
              onClick={() => setTab('stats')}
            >
              Overview
            </button>
            <button
              className={`tab-btn ${tab === 'users' ? 'active' : ''}`}
              onClick={() => setTab('users')}
            >
              Users ({users.length})
            </button>
            <button
              className={`tab-btn ${tab === 'claims' ? 'active' : ''}`}
              onClick={() => setTab('claims')}
            >
              Claims ({claims.length})
            </button>
            <button
              className={`tab-btn ${tab === 'resources' ? 'active' : ''}`}
              onClick={() => setTab('resources')}
            >
              Resources ({resources.length})
            </button>
            <button
              className={`tab-btn ${tab === 'lost-found' ? 'active' : ''}`}
              onClick={() => setTab('lost-found')}
            >
              Lost &amp; Found ({lostFound.length})
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" /> Loading administration data…
            </div>
          ) : (
            <>
              {/* STATS OVERVIEW */}
              {tab === 'stats' && stats && (
                <div className="admin-stats-grid">
                  <div className="stat-card">
                    <span className="stat-icon">👥</span>
                    <div className="stat-value">{stats.userCount}</div>
                    <div className="stat-label">Registered Users</div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">📦</span>
                    <div className="stat-value">{stats.resourceCount}</div>
                    <div className="stat-label">Active Resources</div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">🔍</span>
                    <div className="stat-value">{stats.lostFoundCount}</div>
                    <div className="stat-label">Lost &amp; Found Reports</div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">⏳</span>
                    <div className="stat-value">{stats.pendingClaims}</div>
                    <div className="stat-label">Pending Claims</div>
                  </div>
                </div>
              )}

              {/* USERS MANAGEMENT */}
              {tab === 'users' && (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u._id}>
                          <td><strong>{u.username}</strong></td>
                          <td>{u.email}</td>
                          <td>
                            <span className={`status-badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button
                              onClick={() => handleRoleToggle(u._id, u.role)}
                              className="btn-sm btn-secondary"
                            >
                              Toggle Role ({u.role === 'admin' ? 'Make User' : 'Make Admin'})
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* CLAIMS REVIEW */}
              {tab === 'claims' && (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Claimant</th>
                        <th>Verification</th>
                        <th>Pickup Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claims.map((c) => (
                        <tr key={c._id}>
                          <td><strong>{c.item?.title || 'Unknown'}</strong></td>
                          <td>{c.claimant?.username} ({c.claimant?.email})</td>
                          <td style={{ maxWidth: '200px', fontSize: '13px' }}>
                            {c.verificationDetails}
                          </td>
                          <td>{c.preferredPickupTime || 'N/A'}</td>
                          <td>
                            <span className={`status-badge badge-${c.status}`}>{c.status}</span>
                          </td>
                          <td>
                            {c.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => handleClaimReview(c._id, 'approved')}
                                  className="btn-sm btn-primary"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleClaimReview(c._id, 'rejected')}
                                  className="btn-sm btn-danger"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#666' }}>Reviewed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* RESOURCES MODERATION */}
              {tab === 'resources' && (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Owner</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resources.map((r) => (
                        <tr key={r._id}>
                          <td><strong>{r.title}</strong></td>
                          <td>{r.category}</td>
                          <td><span className={`status-badge ${r.status}`}>{r.status}</span></td>
                          <td>{r.owner?.username || 'Unknown'}</td>
                          <td>
                            <button
                              onClick={() => handleDeleteResource(r._id)}
                              className="btn-sm btn-danger"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* LOST & FOUND MODERATION */}
              {tab === 'lost-found' && (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Location</th>
                        <th>Reporter</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lostFound.map((i) => (
                        <tr key={i._id}>
                          <td><strong>{i.title}</strong></td>
                          <td><span className={`status-badge ${i.reportType}`}>{i.reportType}</span></td>
                          <td><span className={`status-badge ${i.status}`}>{i.status}</span></td>
                          <td>{i.location}</td>
                          <td>{i.reporter?.username || 'Unknown'}</td>
                          <td>
                            <button
                              onClick={() => handleDeleteLostFound(i._id)}
                              className="btn-sm btn-danger"
                            >
                              Delete
                            </button>
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

export default Admin;
