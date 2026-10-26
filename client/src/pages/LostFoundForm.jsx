import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { lostFoundApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const LostFoundForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    reportType: 'lost',
    title: '',
    description: '',
    location: '',
    incidentDate: new Date().toISOString().split('T')[0],
    status: 'open',
    imageUrl: '',
  });

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    lostFoundApi
      .getOne(id)
      .then((res) => {
        const item = res.data.item;
        const reporterId = item.reporter?._id || item.reporter;
        if (user && reporterId && String(user._id) !== String(reporterId)) {
          setUnauthorized(true);
          setError('You are not authorized to edit this report. Only the original reporter can edit it.');
          return;
        }
        setForm({
          reportType: item.reportType || 'lost',
          title: item.title || '',
          description: item.description || '',
          location: item.location || '',
          incidentDate: item.incidentDate ? new Date(item.incidentDate).toISOString().split('T')[0] : '',
          status: item.status || 'open',
          imageUrl: item.imageUrl || '',
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (unauthorized) return;
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await lostFoundApi.update(id, form);
        navigate(`/lost-found/${id}`);
      } else {
        const res = await lostFoundApi.create(form);
        navigate(`/lost-found/${res.data.item._id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="app-layout">
        <Header />
        <div className="main-container">
          <Sidebar />
          <main className="main-content">
            <div className="alert alert-error" style={{ margin: '20px 0' }}>
              ⛔ {error || 'You are not authorized to edit this report. Only the original reporter can edit it.'}
            </div>
            <Link to={id ? `/lost-found/${id}` : '/lost-found'} className="btn btn-secondary">
              ← Back to Report
            </Link>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Header />
      <div className="main-container">
        <Sidebar />
        <main className="main-content">
          <div className="form-container">
            <div className="form-header">
              <h1 className="form-title">{isEdit ? 'Edit Report' : 'Report Item'}</h1>
              <p className="form-subtitle">Help others find their lost items or report found items</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-card">
              <form className="report-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Report Type *</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="reportType"
                        value="lost"
                        checked={form.reportType === 'lost'}
                        onChange={handleChange}
                        disabled={isEdit}
                      />
                      <span>I Lost Something</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="reportType"
                        value="found"
                        checked={form.reportType === 'found'}
                        onChange={handleChange}
                        disabled={isEdit}
                      />
                      <span>I Found Something</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="title">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    className="form-input"
                    placeholder="e.g., Wallet, Keys, Calculator, Laptop"
                    value={form.title}
                    onChange={handleChange}
                    required
                    maxLength={120}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="description">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    className="form-input"
                    rows="4"
                    placeholder="Describe the item in detail (color, brand, distinguishing features...)"
                    value={form.description}
                    onChange={handleChange}
                    required
                    maxLength={1000}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="location">
                      Location *
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      className="form-input"
                      placeholder="Where was it lost/found?"
                      value={form.location}
                      onChange={handleChange}
                      required
                      maxLength={200}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="incidentDate">
                      Date *
                    </label>
                    <input
                      type="date"
                      id="incidentDate"
                      name="incidentDate"
                      className="form-input"
                      value={form.incidentDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {isEdit && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="status">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      className="form-input"
                      value={form.status}
                      onChange={handleChange}
                    >
                      <option value="open">Open</option>
                      <option value="claimed">Claimed</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="imageUrl">
                    Image URL (optional)
                  </label>
                  <input
                    type="url"
                    id="imageUrl"
                    name="imageUrl"
                    className="form-input"
                    placeholder="https://images.unsplash.com/..."
                    value={form.imageUrl}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-actions">
                  <Link to="/lost-found" className="btn btn-secondary">
                    Cancel
                  </Link>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Submitting…' : isEdit ? 'Update Report' : 'Submit Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LostFoundForm;
