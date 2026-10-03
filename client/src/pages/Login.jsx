import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/client.js';
import ErrorBox from '../components/ErrorBox.jsx';
import { useToast } from '../context/ToastContext.jsx';
import FieldError, { errorId, errorProps } from '../components/FieldError.jsx';
import { hasErrors, validateLogin } from '../utils/validation.js';

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const redirectTo = from ? `${from.pathname}${from.search || ''}` : '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={redirectTo} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const problems = validateLogin(form);
    setErrors(problems);
    if (hasErrors(problems)) return;
    setSubmitting(true);
    try {
      const u = await login(form);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
      navigate(from ? redirectTo : u.role === 'admin' ? '/admin' : '/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (email) => setForm({ email, password: 'password123' });

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit} noValidate>
        <h1>Welcome back</h1>
        <p className="muted">Log in to book stays and manage your listings.</p>
        <ErrorBox message={error} />

        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" value={form.email}
            onChange={(e) => { setErrors({}); setForm({ ...form, email: e.target.value }); }} {...errorProps(errors, 'email')} />
          <FieldError id={errorId('email')} message={errors.email} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={form.password}
            onChange={(e) => { setErrors({}); setForm({ ...form, password: e.target.value }); }} {...errorProps(errors, 'password')} />
          <FieldError id={errorId('password')} message={errors.password} />
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>

        <div className="demo-accounts">
          <span className="muted small">Demo accounts (after running the seed):</span>
          <div className="row gap">
            <button type="button" className="chip" onClick={() => fillDemo('guest@demo.com')}>Guest</button>
            <button type="button" className="chip" onClick={() => fillDemo('host@demo.com')}>Host</button>
            <button type="button" className="chip" onClick={() => fillDemo('admin@demo.com')}>Admin</button>
          </div>
        </div>

        <p className="muted center">
          New here? <Link to="/register" state={location.state}>Create an account</Link>
        </p>
      </form>
    </div>
  );
}
