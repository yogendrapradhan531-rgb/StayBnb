import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usersApi } from '../api/services.js';
import { getErrorMessage } from '../api/client.js';
import Avatar from '../components/Avatar.jsx';
import Modal from '../components/Modal.jsx';
import { formatDate } from '../utils/format.js';
import FieldError, { errorId, errorProps } from '../components/FieldError.jsx';
import { VerificationBadge } from '../components/Badges.jsx';
import { fieldErrorsFrom, hasErrors, isMobileValid, validatePassword } from '../utils/validation.js';

export default function Profile() {
  const { user, isHost, updateProfile, becomeHost } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ name: '', avatar: '', bio: '', location: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    setForm({ name: user.name || '', avatar: user.avatar || '', bio: user.bio || '', location: user.location || '', phone: user.phone || '' });
  }, [user]);

  useEffect(() => {
    usersApi.stats().then(({ stats: s }) => setStats(s)).catch(() => {});
  }, []);

  const set = (key) => (e) => {
    setErrors((errs) => ({ ...errs, [key]: undefined }));
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };
  const dirty = ['name', 'avatar', 'bio', 'location', 'phone'].some((k) => (user[k] || '') !== form[k]);

  const save = async (e) => {
    e.preventDefault();
    const problems = {};
    if (form.name.trim().length < 2) problems.name = 'Name should be at least 2 characters';
    if (form.avatar && !/^https?:\/\//i.test(form.avatar)) problems.avatar = 'Profile photo must be a link starting with http:// or https://';
    if (!isMobileValid(form.phone)) problems.phone = 'Enter a 10-digit Indian mobile number, e.g. 98450 12345';
    if (hasErrors(problems)) return setErrors(problems);
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success('Profile updated');
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      toast.error(getErrorMessage(err, 'Could not save profile'));
    } finally {
      setSaving(false);
    }
  };

  const switchToHost = async () => {
    try {
      await becomeHost();
      toast.success('You’re now a host! Create your first listing from the dashboard.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="container page profile-page">
      <aside className="card profile-card">
        <Avatar user={{ ...user, ...form }} size={104} />
        <h2>{form.name || user.name}</h2>
        <span className={isHost ? 'badge badge-brand' : 'badge'}>{isHost ? 'Host' : 'Guest'}</span>
        {form.location && <p className="muted">📍 {form.location}</p>}
        <p className="muted small">Member since {formatDate(user.createdAt, { month: 'long', year: 'numeric' })}</p>
        {isHost && (
          <p className="row gap small">Identity: <VerificationBadge status={user.hostVerification?.status} /></p>
        )}

        {stats && (
          <dl className="profile-stats">
            <div><dd>{stats.trips}</dd><dt>Trips</dt></div>
            <div><dd>{stats.reviews}</dd><dt>Reviews</dt></div>
            <div><dd>{stats.saved}</dd><dt>Saved</dt></div>
          </dl>
        )}

        <div className="profile-links">
          <Link to="/trips" className="btn btn-outline btn-block">My trips</Link>
          <Link to="/wishlist" className="btn btn-outline btn-block">Wishlist</Link>
          {isHost ? (
            <Link to="/host" className="btn btn-dark btn-block">Host dashboard</Link>
          ) : (
            <button type="button" className="btn btn-dark btn-block" onClick={switchToHost}>Become a host</button>
          )}
        </div>
      </aside>

      <section className="profile-main">
        <h1>Your profile</h1>
        <form className="card form-section" onSubmit={save}>
          <h3>Personal info</h3>
          <div className="form-grid">
            <label className="field">
              <span>Full name</span>
              <input value={form.name} maxLength={60} onChange={set('name')} {...errorProps(errors, 'name')} />
              <FieldError id={errorId('name')} message={errors.name} />
            </label>
            <label className="field">
              <span>Mobile (+91)</span>
              <input value={form.phone} inputMode="tel" placeholder="98450 12345" onChange={set('phone')} {...errorProps(errors, 'phone')} />
              <FieldError id={errorId('phone')} message={errors.phone} />
            </label>
            <label className="field">
              <span>Lives in</span>
              <input value={form.location} maxLength={80} placeholder="e.g. Bengaluru, India" onChange={set('location')} />
            </label>
          </div>
          <label className="field">
            <span>Email</span>
            <input value={user.email} disabled />
          </label>
          <label className="field">
            <span>Profile photo URL</span>
            <input value={form.avatar} placeholder="https://…" onChange={set('avatar')} {...errorProps(errors, 'avatar')} />
            <FieldError id={errorId('avatar')} message={errors.avatar} />
          </label>
          <label className="field">
            <span>About you</span>
            <textarea rows={4} maxLength={500} value={form.bio} onChange={set('bio')}
              placeholder="Tell hosts and guests a little about yourself" />
            <small className="muted">{form.bio.length}/500</small>
          </label>
          <div className="row gap">
            <button type="submit" className="btn btn-primary" disabled={!dirty || saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {dirty && (
              <button type="button" className="btn btn-link" onClick={() => { setErrors({}); setForm({ name: user.name, avatar: user.avatar || '', bio: user.bio || '', location: user.location || '', phone: user.phone || '' }); }}>
                Discard
              </button>
            )}
          </div>
        </form>

        <div className="card form-section">
          <h3>Login & security</h3>
          <div className="row space-between wrap">
            <div>
              <strong>Password</strong>
              <p className="muted small">At least 8 characters with a letter and a number.</p>
            </div>
            <button type="button" className="btn btn-outline" onClick={() => setPwOpen(true)}>Update password</button>
          </div>
        </div>
      </section>

      <PasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

function PasswordModal({ open, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setError('');
      setFieldErrors({});
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    const problems = validatePassword(form);
    setFieldErrors(problems);
    if (hasErrors(problems)) return;
    setBusy(true);
    setError('');
    try {
      await usersApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password updated');
      onClose();
    } catch (err) {
      const errs = fieldErrorsFrom(err);
      if (hasErrors(errs)) setFieldErrors(errs);
      else setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const set = (key) => (e) => {
    setFieldErrors((errs) => ({ ...errs, [key]: undefined }));
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  return (
    <Modal open={open} onClose={onClose} title="Update password" size="sm">
      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>Current password</span>
          <input type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} {...errorProps(fieldErrors, 'currentPassword')} />
          <FieldError id={errorId('currentPassword')} message={fieldErrors.currentPassword} />
        </label>
        <label className="field">
          <span>New password</span>
          <input type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} {...errorProps(fieldErrors, 'newPassword')} />
          <FieldError id={errorId('newPassword')} message={fieldErrors.newPassword} />
        </label>
        <label className="field">
          <span>Confirm new password</span>
          <input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} {...errorProps(fieldErrors, 'confirm')} />
          <FieldError id={errorId('confirm')} message={fieldErrors.confirm} />
        </label>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button type="submit" className="btn btn-dark btn-block" disabled={busy}>
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </Modal>
  );
}
