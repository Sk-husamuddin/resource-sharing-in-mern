import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resourceApi, lostFoundApi } from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const Profile = () => {
  const { user } = useAuth();
  const [myResources, setMyResources] = useState([]);
  const [myLostFound, setMyLostFound] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resResp, lfResp] = await Promise.all([
          resourceApi.getAll({ limit: 50 }),
          lostFoundApi.getAll({ limit: 50 }),
        ]);

        if (user) {
          const userRes = (resResp.data.items || resResp.data.resources || []).filter(
            (r) => r.owner?._id === user._id || r.owner === user._id
          );
          const userLF = (lfResp.data.items || []).filter(
            (i) => i.reporter?._id === user._id || i.reporter === user._id
          );
          setMyResources(userRes);
          setMyLostFound(userLF);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return (
    <div className="app-layout">
      <Header />
      <div className="main-container">
        <Sidebar />
        <main className="main-content">
          <div className="content-header">
            <h1 className="page-title">My Profile</h1>
          </div>

          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                <img src="/people.png" alt="Avatar" />
              </div>
              <div className="profile-info">
                <h2>{user?.displayName || user?.username}</h2>
                <p className="profile-email">📧 {user?.email}</p>
                <div className="profile-badges">
                  <span className={`badge badge-role ${user?.role}`}>
                    {user?.role === 'admin' ? '🛡️ Administrator' : '👤 Student / Member'}
                  </span>
                  <span className="badge badge-date">
                    Joined: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Member'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-sections">
            <div className="profile-sub-section">
              <div className="sub-section-header">
                <h3>My Shared Resources ({myResources.length})</h3>
                <Link to="/resources/new" className="btn-sm btn-primary">
                  + Upload New
                </Link>
              </div>

              {loading ? (
                <p>Loading…</p>
              ) : myResources.length === 0 ? (
                <p className="empty-subtext">You haven't uploaded any resources yet.</p>
              ) : (
                <div className="profile-items-list">
                  {myResources.map((res) => (
                    <div key={res._id} className="profile-item-row">
                      <div>
                        <strong>{res.title}</strong>
                        <span className="item-category-tag">{res.category}</span>
                        <span className={`status-badge ${res.status}`}>{res.status}</span>
                      </div>
                      <div className="item-row-actions">
                        <Link to={`/resources/${res._id}`} className="btn-sm btn-secondary">
                          View
                        </Link>
                        <Link to={`/resources/${res._id}/edit`} className="btn-sm btn-secondary">
                          Edit
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="profile-sub-section">
              <div className="sub-section-header">
                <h3>My Lost &amp; Found Reports ({myLostFound.length})</h3>
                <Link to="/lost-found/new" className="btn-sm btn-primary">
                  + Report Item
                </Link>
              </div>

              {loading ? (
                <p>Loading…</p>
              ) : myLostFound.length === 0 ? (
                <p className="empty-subtext">You haven't reported any lost or found items.</p>
              ) : (
                <div className="profile-items-list">
                  {myLostFound.map((item) => (
                    <div key={item._id} className="profile-item-row">
                      <div>
                        <strong>{item.title}</strong>
                        <span className={`status-badge ${item.reportType}`}>{item.reportType}</span>
                        <span className={`status-badge ${item.status}`}>{item.status}</span>
                      </div>
                      <div className="item-row-actions">
                        <Link to={`/lost-found/${item._id}`} className="btn-sm btn-secondary">
                          View
                        </Link>
                        <Link to={`/lost-found/${item._id}/edit`} className="btn-sm btn-secondary">
                          Edit
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
