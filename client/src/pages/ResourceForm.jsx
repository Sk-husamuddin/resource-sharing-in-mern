import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { resourceApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const CATEGORIES = [
  { value: 'study-materials', label: 'Study Materials' },
  { value: 'books-notes', label: 'Books & Notes' },
  { value: 'tools-equipment', label: 'Tools & Equipment' },
  { value: 'other', label: 'Other' },
];

const ResourceForm = () => {
  const { id } = useParams(); // undefined when creating
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    title: '', description: '', category: 'other',
    location: '', availabilityDetails: '', status: 'available', imageUrl: '',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    resourceApi.getOne(id)
      .then(res => {
        const r = res.data.resource;
        const ownerId = r.owner?._id || r.owner;
        if (user && ownerId && String(user._id) !== String(ownerId)) {
          setUnauthorized(true);
          setError('You are not authorized to edit this resource. Only the creator/owner can edit it.');
          return;
        }
        setForm({
          title: r.title, description: r.description, category: r.category,
          location: r.location || '', availabilityDetails: r.availabilityDetails || '',
          status: r.status, imageUrl: r.imageUrl || '',
        });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit, user]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (unauthorized) return;
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await resourceApi.update(id, form);
        navigate(`/resources/${id}`);
      } else {
        const res = await resourceApi.create(form);
        navigate(`/resources/${res.data.resource._id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  if (unauthorized) {
    return (
      <div className="app-layout">
        <Header />
        <div className="main-container">
          <Sidebar />
          <main className="main-content">
            <div className="alert alert-error" style={{ margin: '20px 0' }}>
              ⛔ {error || 'You are not authorized to edit this resource. Only the creator can edit it.'}
            </div>
            <Link to={id ? `/resources/${id}` : '/resources'} className="btn btn-secondary">
              ← Back to Resource
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
          <div className="content-header">
            <h1 className="page-title">{isEdit ? 'Edit Resource' : 'Upload Resource'}</h1>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-card">
            <form onSubmit={handleSubmit} className="resource-form">
              <div className="form-group">
                <label className="form-label" htmlFor="title">Title *</label>
                <input id="title" name="title" className="form-input" value={form.title} onChange={handleChange} required maxLength={120} placeholder="Resource title" />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="description">Description *</label>
                <textarea id="description" name="description" className="form-input" rows={4} value={form.description} onChange={handleChange} required maxLength={1000} placeholder="Describe the resource…" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="category">Category *</label>
                  <select id="category" name="category" className="form-input" value={form.category} onChange={handleChange} required>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="status">Status</label>
                  <select id="status" name="status" className="form-input" value={form.status} onChange={handleChange}>
                    <option value="available">Available</option>
                    <option value="borrowed">Borrowed</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="location">Location</label>
                <input id="location" name="location" className="form-input" value={form.location} onChange={handleChange} maxLength={200} placeholder="Where can it be picked up?" />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="availabilityDetails">Availability Details</label>
                <input id="availabilityDetails" name="availabilityDetails" className="form-input" value={form.availabilityDetails} onChange={handleChange} maxLength={300} placeholder="When is it available?" />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="imageUrl">Image URL (optional)</label>
                <input id="imageUrl" name="imageUrl" className="form-input" value={form.imageUrl} onChange={handleChange} placeholder="https://…" />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : (isEdit ? 'Update Resource' : 'Upload Resource')}
                </button>
                <Link to={isEdit ? `/resources/${id}` : '/resources'} className="btn btn-secondary">Cancel</Link>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResourceForm;
