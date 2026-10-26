import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { resourceApi, messageApi } from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const ContactOwner = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    message: '',
    timeframe: 'immediately',
  });

  useEffect(() => {
    resourceApi
      .getOne(id)
      .then((res) => {
        setResource(res.data.resource);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);

    try {
      const fullMessage = `[Timeframe needed: ${form.timeframe}]\n\n${form.message}`;
      await messageApi.send({
        recipient: resource.owner._id,
        content: fullMessage,
        relatedResource: id,
      });

      setSuccess('Message sent successfully to the owner!');
      setTimeout(() => {
        navigate('/messages');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Header />
      <div className="main-container">
        <Sidebar />
        <main className="main-content">
          <div className="contact-container">
            <div className="contact-header">
              <h1 className="contact-title">Contact Resource Owner</h1>
              <p className="contact-subtitle">
                Get in touch with <strong>{resource?.owner?.displayName || resource?.owner?.username}</strong> regarding "<strong>{resource?.title}</strong>"
              </p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="form-card">
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="timeframe">
                    When do you need it?
                  </label>
                  <select
                    id="timeframe"
                    name="timeframe"
                    className="form-input"
                    value={form.timeframe}
                    onChange={handleChange}
                  >
                    <option value="immediately">Immediately</option>
                    <option value="this-week">This week</option>
                    <option value="next-week">Next week</option>
                    <option value="this-month">This month</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="message">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    className="form-input"
                    rows={5}
                    placeholder="Hi, I'm interested in this resource. Please let me know when it's available for borrowing..."
                    value={form.message}
                    onChange={handleChange}
                    required
                    maxLength={2000}
                  />
                </div>

                <div className="form-actions">
                  <Link to={`/resources/${id}`} className="btn btn-secondary">
                    Go Back
                  </Link>
                  <button type="submit" className="btn btn-primary" disabled={sending}>
                    {sending ? 'Sending…' : 'Send Message'}
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

export default ContactOwner;
