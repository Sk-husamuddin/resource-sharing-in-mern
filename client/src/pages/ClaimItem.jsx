import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { lostFoundApi, claimApi } from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const ClaimItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    verificationDetails: '',
    preferredPickupTime: '',
    department: '',
    proof: '',
    agreed: false,
  });

  useEffect(() => {
    lostFoundApi
      .getOne(id)
      .then((res) => {
        setItem(res.data.item);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.agreed) {
      setError('You must certify that you are the rightful owner.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      // Combines ownership proof and private verification details
      const combinedVerification = `Proof: ${form.proof || 'N/A'}\nDept: ${form.department || 'N/A'}\nDetails: ${form.verificationDetails}`;
      await claimApi.create({
        item: id,
        verificationDetails: combinedVerification.slice(0, 500),
        preferredPickupTime: form.preferredPickupTime,
      });
      setSuccess('Your claim has been submitted successfully! Redirecting to claims...');
      setTimeout(() => {
        navigate('/claims');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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
          <div className="claim-container">
            <div className="claim-header">
              <h1 className="claim-title">Claim Found Item</h1>
              <p className="claim-subtitle">
                Provide details to verify your ownership of: <strong>{item?.title}</strong>
              </p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="form-card">
              <form className="claim-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="department">
                    Department / Faculty
                  </label>
                  <select
                    id="department"
                    name="department"
                    className="form-input"
                    value={form.department}
                    onChange={handleChange}
                  >
                    <option value="">Select your department</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Business/Management">Business / Management</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="verificationDetails">
                    Item Description &amp; Identifying Details *
                  </label>
                  <textarea
                    id="verificationDetails"
                    name="verificationDetails"
                    className="form-input"
                    rows={4}
                    placeholder="Describe specific features (color, scratches, stickers, wallpaper, contents)..."
                    value={form.verificationDetails}
                    onChange={handleChange}
                    required
                    maxLength={350}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="proof">
                    Proof of Ownership *
                  </label>
                  <textarea
                    id="proof"
                    name="proof"
                    className="form-input"
                    rows={3}
                    placeholder="Provide specific details only the true owner would know..."
                    value={form.proof}
                    onChange={handleChange}
                    required
                    maxLength={150}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="preferredPickupTime">
                    Preferred Pickup Time
                  </label>
                  <select
                    id="preferredPickupTime"
                    name="preferredPickupTime"
                    className="form-input"
                    value={form.preferredPickupTime}
                    onChange={handleChange}
                  >
                    <option value="">Select preferred time</option>
                    <option value="Morning (9AM - 12PM)">Morning (9AM - 12PM)</option>
                    <option value="Afternoon (12PM - 4PM)">Afternoon (12PM - 4PM)</option>
                    <option value="Evening (4PM - 6PM)">Evening (4PM - 6PM)</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>

                <div className="verification-checkbox">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="agreed"
                      checked={form.agreed}
                      onChange={handleChange}
                      required
                    />
                    <span>
                      I certify that I am the rightful owner of this item and understand that false claims may result in disciplinary action.
                    </span>
                  </label>
                </div>

                <div className="form-actions">
                  <Link to={`/lost-found/${id}`} className="btn btn-secondary">
                    Go Back
                  </Link>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit Claim'}
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

export default ClaimItem;
