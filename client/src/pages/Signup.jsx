import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(er => ({ ...er, [e.target.name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.username || form.username.length < 3) errs.username = 'Username must be at least 3 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email.';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setServerError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-box">
        <div className="signup-logo">🔗 Resource Hub</div>
        <h1 className="signup-title">Create Account</h1>
        <p className="signup-subtitle">Join the community today</p>

        {serverError && <div className="alert alert-error" role="alert">{serverError}</div>}

        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          {[
            { name: 'username', label: 'Username', type: 'text', placeholder: 'Choose a username', autoComplete: 'username' },
            { name: 'email', label: 'Email Address', type: 'email', placeholder: 'Enter your email', autoComplete: 'email' },
            { name: 'password', label: 'Password', type: 'password', placeholder: 'Create a password (min. 8 chars)', autoComplete: 'new-password' },
            { name: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: 'Confirm your password', autoComplete: 'new-password' },
          ].map(({ name, label, type, placeholder, autoComplete }) => (
            <div className="form-group" key={name}>
              <label className="form-label" htmlFor={name}>{label}</label>
              <input
                id={name}
                name={name}
                type={type}
                className={`form-input${errors[name] ? ' input-error' : ''}`}
                placeholder={placeholder}
                value={form[name]}
                onChange={handleChange}
                autoComplete={autoComplete}
              />
              {errors[name] && <span className="field-error">{errors[name]}</span>}
            </div>
          ))}
          <button type="submit" className="signup-btn" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="form-footer">
          <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
