import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { resourceApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const CATEGORY_LABELS = {
  'study-materials': 'Study Materials',
  'books-notes': 'Books & Notes',
  'tools-equipment': 'Tools & Equipment',
  'other': 'Other',
};

const CATEGORY_IMGS = {
  'study-materials': '/people.png',
  'books-notes': '/shopping-cart.png',
  'tools-equipment': '/menu-img.png',
  'other': '/loupe.png',
};

const ResourceList = ({ categoryProp }) => {
  const { category: paramCategory } = useParams();
  const category = categoryProp || paramCategory;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page };
      if (category) params.category = category;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await resourceApi.getAll(params);
      setItems(res.data.items || []);
      setPages(res.data.pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [category, statusFilter, page, search]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    // If page is already 1, fetchResources won't re-run from the page dep alone,
    // so call it directly after ensuring page state is reset.
    if (page === 1) fetchResources();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    try {
      await resourceApi.remove(id);
      setItems(prev => prev.filter(i => i._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const pageTitle = category ? (CATEGORY_LABELS[category] || category) : 'All Resources';

  return (
    <div className="app-layout">
      <Header />
      <div className="main-container">
        <Sidebar />
        <main className="main-content">
          <div className="content-header">
            <h1 className="page-title">{pageTitle}</h1>
            {user && <Link to="/resources/new" className="upload-btn">+ Upload Resource</Link>}
          </div>

          <div className="search-filter-bar">
            <form onSubmit={handleSearch} className="search-box">
              <input
                className="search-input"
                placeholder="Search resources…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button type="submit" className="search-btn">
                <img src="/loupe.png" alt="Search" className="search-icon" />
              </button>
            </form>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="borrowed">Borrowed</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          {loading && <div className="loading-state"><div className="spinner" /> Loading resources…</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="empty-state">
              <span>📦</span>
              <p>No resources found. {user && <Link to="/resources/new">Be the first to upload one!</Link>}</p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="resource-list-grid">
              {items.map(item => {
                const isOwner = Boolean(user?._id && item.owner?._id && String(user._id) === String(item.owner._id));
                const isAdmin = user?.role === 'admin';
                return (
                  <div key={item._id} className="resource-list-card">
                    <div className="card-image-sm">
                      <img src={item.imageUrl || CATEGORY_IMGS[item.category] || '/people.png'} alt={item.title} />
                    </div>
                    <div className="card-info">
                      <h3><Link to={`/resources/${item._id}`}>{item.title}</Link></h3>
                      <p className="card-desc">{item.description.substring(0, 100)}{item.description.length > 100 ? '…' : ''}</p>
                      <div className="card-meta">
                        <span className="badge badge-category">{CATEGORY_LABELS[item.category] || item.category}</span>
                        <span className={`badge badge-status badge-${item.status}`}>{item.status}</span>
                        {item.location && <span className="meta-loc">📍 {item.location}</span>}
                      </div>
                      <p className="card-owner">By {item.owner?.username || 'Unknown'}</p>
                    </div>
                    <div className="card-actions">
                      <Link to={`/resources/${item._id}`} className="btn-sm btn-primary">View</Link>
                      {isOwner && (
                        <Link to={`/resources/${item._id}/edit`} className="btn-sm btn-secondary">Edit</Link>
                      )}
                      {(isOwner || isAdmin) && (
                        <button onClick={() => handleDelete(item._id)} className="btn-sm btn-danger">Delete</button>
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

export default ResourceList;
