import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getErrorMessage } from '../api/client.js';
import ErrorBox from '../components/ErrorBox.jsx';
import FieldError, { errorId, errorProps } from '../components/FieldError.jsx';
import { fieldErrorsFrom, hasErrors, validateRegister } from '../utils/validation.js';

/** Live checklist under the password field. */
function PasswordHints({ value }) {
  const rules = [
    [value.length >= 8, '8+ characters'],
    [/[A-Za-z]/.test(value), 'a letter'],
    [/\d/.test(value), 'a number'],
  ];
  return (
    <ul className="pw-hints" aria-label="Password requirements">
      {rules.map(([ok, label]) => (
        <li key={label} className={ok ? 'ok' : ''}>{ok ? '✓' : '○'} {label}</li>
      ))}
    </ul>
  );
}

export default function Register() {
  const { user, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'guest' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (key) => (e) => {
    setErrors((errs) => ({ ...errs, [key]: undefined }));
    setForm({ ...form, [key]: e.target.value });
  };
  // Validate one field when the user leaves it
  const blur = (key) => () => {
    const msg = validateRegister(form)[key];
    if (msg && form[key]) setErrors((errs) => ({ ...errs, [key]: msg }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const problems = validateRegister(form);
    if (hasErrors(problems)) return setErrors(problems);
    setSubmitting(true);
    try {
      const u = await register({ ...form, name: form.name.trim(), email: form.email.trim() });
      toast.success(`Welcome to Staybnb, ${u.name.split(' ')[0]}!`);
      const fallback = u.role === 'host' ? '/host' : '/';
      navigate(from ? `${from.pathname}${from.search || ''}` : fallback, { replace: true });
    } catch (err) {
      const fieldErrs = fieldErrorsFrom(err);
      if (hasErrors(fieldErrs)) setErrors(fieldErrs);
      else setError(getErrorMessage(err, 'Sign up failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit} noValidate>
        <h1>Create your account</h1>
        <ErrorBox message={error} />

        <label className="field">
          <span>Full name</span>
          <input autoComplete="name" value={form.name} onChange={set('name')} onBlur={blur('name')} {...errorProps(errors, 'name')} />
          <FieldError id={errorId('name')} message={errors.name} />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" value={form.email} onChange={set('email')} onBlur={blur('email')} {...errorProps(errors, 'email')} />
          <FieldError id={errorId('email')} message={errors.email} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} {...errorProps(errors, 'password')} />
          <PasswordHints value={form.password} />
          <FieldError id={errorId('password')} message={errors.password} />
        </label>

        <fieldset className="role-picker">
          <legend>I want to</legend>
          <label className={form.role === 'guest' ? 'role-option active' : 'role-option'}>
            <input type="radio" name="role" value="guest" checked={form.role === 'guest'} onChange={set('role')} />
            <strong>Travel</strong>
            <span className="muted small">Find and book stays</span>
          </label>
          <label className={form.role === 'host' ? 'role-option active' : 'role-option'}>
            <input type="radio" name="role" value="host" checked={form.role === 'host'} onChange={set('role')} />
            <strong>Host</strong>
            <span className="muted small">List my place</span>
          </label>
        </fieldset>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
        <p className="muted center">
          Already have an account? <Link to="/login" state={location.state}>Log in</Link>
        </p>
      </form>
    </div>
  );
}
