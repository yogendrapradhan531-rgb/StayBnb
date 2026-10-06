import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listingsApi } from '../../api/services.js';
import { getErrorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import SmartImage from '../../components/SmartImage.jsx';
import LocationPicker from '../../components/LocationPicker.jsx';
import FieldError, { errorId, errorProps } from '../../components/FieldError.jsx';
import { ListingStatusBadge } from '../../components/Badges.jsx';
import { capitalize, formatMoney, gstRateFor } from '../../utils/format.js';
import { INDIAN_STATES } from '../../utils/india.js';
import { fieldErrorsFrom, hasErrors, validateListing } from '../../utils/validation.js';

const EMPTY = {
  title: '',
  description: '',
  propertyType: 'apartment',
  pricePerNight: '',
  cleaningFee: '0',
  maxGuests: '2',
  minNights: '1',
  bedrooms: '1',
  beds: '1',
  bathrooms: '1',
  amenities: [],
  imagesText: '',
  address: { street: '', city: '', state: 'Karnataka', pincode: '' },
  location: null, // { lat, lng }
  isActive: true,
};

function fromListing(l) {
  const [lng, lat] = l.location?.coordinates || [];
  return {
    ...EMPTY,
    title: l.title,
    description: l.description,
    propertyType: l.propertyType,
    amenities: l.amenities || [],
    isActive: l.isActive,
    pricePerNight: String(l.pricePerNight),
    cleaningFee: String(l.cleaningFee ?? 0),
    maxGuests: String(l.maxGuests),
           minNights: String(l.minNights ?? 1),
    bedrooms: String(l.bedrooms),
    beds: String(l.beds),
    bathrooms: String(l.bathrooms),
    imagesText: (l.images || []).join('\n'),
    address: { ...EMPTY.address, ...l.address },
    location: Number.isFinite(lat) ? { lat, lng } : null,
  };
}

const NUMBER_FIELDS = [
  ['pricePerNight', 'Price per night (₹)', '1'],
  ['cleaningFee', 'Cleaning fee (₹)', '1'],
  ['maxGuests', 'Max guests', '1'],
  ['bedrooms', 'Bedrooms', '1'],
  ['beds', 'Beds', '1'],
  ['bathrooms', 'Bathrooms', '0.5'],
];

export default function ListingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [original, setOriginal] = useState(null); // for status banner on edit
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const tasks = [listingsApi.meta()];
    if (isEdit) tasks.push(listingsApi.get(id));
    Promise.all(tasks)
      .then(([m, res]) => {
        setMeta(m);
        if (res) {
          if (String(res.listing.host?._id || res.listing.host) !== String(user._id)) {
            setError('You can only edit your own listings.');
            return;
          }
          setOriginal(res.listing);
          setForm(fromListing(res.listing));
        }
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, isEdit, user._id]);

  // Clear a field's error as soon as the user edits it
  const clear = (key) => setErrors((e) => {
    if (!e[key]) return e;
    const next = { ...e };
    delete next[key];
    return next;
  });
  const set = (key) => (e) => {
    clear(key);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };
  const setAddr = (key) => (e) => {
    clear(`address.${key}`);
    const value = key === 'pincode' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value;
    setForm((f) => ({ ...f, address: { ...f.address, [key]: value } }));
  };
  const toggleAmenity = (a) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));

  const images = form.imagesText.split('\n').map((s) => s.trim()).filter(Boolean);
  const price = Number(form.pricePerNight);
  const gstRate = price > 0 ? gstRateFor(price) : null;

  const focusFirstError = (errs) => {
    const first = Object.keys(errs)[0];
    const el = document.querySelector(`[aria-describedby="${errorId(first)}"]`);
    el?.focus();
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const submit = async (e) => {
    e.preventDefault();
    const problems = validateListing(form, images);
    if (hasErrors(problems)) {
      setErrors(problems);
      toast.error(`Please fix ${Object.keys(problems).length === 1 ? 'the highlighted field' : `${Object.keys(problems).length} highlighted fields`}`);
      setTimeout(() => focusFirstError(problems), 0);
      return;
    }
    setError('');
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      propertyType: form.propertyType,
      pricePerNight: Number(form.pricePerNight),
      cleaningFee: Number(form.cleaningFee) || 0,
      maxGuests: Number(form.maxGuests),
      bedrooms: Number(form.bedrooms),
      beds: Number(form.beds),
      bathrooms: Number(form.bathrooms),
      amenities: form.amenities,
      images,
      address: form.address,
      location: form.location,
      isActive: form.isActive,
    };
    try {
      const res = isEdit ? await listingsApi.update(id, payload) : await listingsApi.create(payload);
      toast.success(res.message || 'Saved');
      navigate(res.listing.status === 'approved' ? `/listings/${res.listing._id}` : '/host?tab=listings');
    } catch (err) {
      const fieldErrs = fieldErrorsFrom(err);
      if (hasErrors(fieldErrs)) {
        setErrors(fieldErrs);
        setTimeout(() => focusFirstError(fieldErrs), 0);
      }
      setError(getErrorMessage(err, 'Could not save listing'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner full />;
  if (!meta) return <div className="container page"><ErrorBox message={error || 'Could not load form'} /></div>;

  return (
    <div className="container page narrow">
      <Link to="/host?tab=listings" className="muted back-link">‹ Back to dashboard</Link>
      <h1>{isEdit ? 'Edit listing' : 'Create a new listing'}</h1>
      {!isEdit && (
        <p className="muted">New listings are reviewed by our team before they appear in search – usually within 24 hours.</p>
      )}

      {original && original.status !== 'approved' && (
        <div className={original.status === 'rejected' ? 'alert alert-error' : 'alert alert-warning'}>
          <span>
            <ListingStatusBadge status={original.status} />{' '}
            {original.status === 'rejected'
              ? `Reviewer’s note: ${original.rejectionReason}. Saving your changes resubmits the listing.`
              : 'This listing is waiting for review.'}
          </span>
        </div>
      )}
      {original?.status === 'approved' && (
        <p className="muted small">Changing the title, description, photos, type or address sends the listing back for a quick review. Price and amenity changes go live immediately.</p>
      )}

      <ErrorBox message={error} />

      <form className="listing-form" onSubmit={submit} noValidate>
        <section className="card form-section">
          <h2>Basics</h2>
          <label className="field">
            <span>Title</span>
            <input value={form.title} maxLength={100} onChange={set('title')} placeholder="e.g. Coffee estate cottage with valley views" {...errorProps(errors, 'title')} />
            <FieldError id={errorId('title')} message={errors.title} />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea rows={5} value={form.description} maxLength={5000} onChange={set('description')}
              placeholder="What makes your place special? Mention nearby attractions, food and how to get there." {...errorProps(errors, 'description')} />
            <small className="muted">{form.description.trim().length}/50 characters minimum</small>
            <FieldError id={errorId('description')} message={errors.description} />
          </label>
          <label className="field">
            <span>Property type</span>
            <select value={form.propertyType} onChange={set('propertyType')}>
              {meta.propertyTypes.map((t) => <option key={t} value={t}>{capitalize(t)}</option>)}
            </select>
          </label>
        </section>

        <section className="card form-section">
          <h2>Capacity & pricing</h2>
          <div className="form-grid">
            {NUMBER_FIELDS.map(([key, label, step]) => (
              <label key={key} className="field">
                <span>{label}</span>
                <input type="number" min="0" step={step} value={form[key]} onChange={set(key)} {...errorProps(errors, key)} />
                <FieldError id={errorId(key)} message={errors[key]} />
              </label>
            ))}
          </div>
          {gstRate !== null && (
            <p className="gst-hint muted small">
              GST slab for {formatMoney(price)}/night: <strong>{gstRate}%</strong>
              {gstRate === 0 ? ' (exempt – up to ₹1,000)' : gstRate === 5 ? ' (₹1,001–₹7,500)' : ' (above ₹7,500)'}.
              Guests see GST added at checkout; your payout is the nightly price + cleaning fee.
            </p>
          )}
        </section>

        <section className="card form-section">
          <h2>Amenities</h2>
          <div className="amenity-grid">
            {meta.amenities.map((a) => (
              <label key={a} className="checkbox">
                <input type="checkbox" checked={form.amenities.includes(a)} onChange={() => toggleAmenity(a)} />
                {capitalize(a)}
              </label>
            ))}
          </div>
        </section>

        <section className="card form-section">
          <h2>Photos</h2>
          <label className="field">
            <span>Image links – one per line, the first is the cover (https only, max 10)</span>
            <textarea rows={4} value={form.imagesText} onChange={set('imagesText')}
              placeholder="https://images.unsplash.com/photo-..." {...errorProps(errors, 'images')} />
            <FieldError id={errorId('images')} message={errors.images} />
          </label>
          {images.length > 0 && (
            <div className="image-previews">
              {images.slice(0, 10).map((src, i) => (
                <div key={src + i} className="image-preview">
                  <SmartImage src={src} alt={`Preview ${i + 1}`} width={400} sizes="120px" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card form-section">
          <h2>Location</h2>
          <div className="form-grid">
            <label className="field">
              <span>Street / area</span>
              <input value={form.address.street} placeholder="e.g. 12th Main, HAL 2nd Stage" onChange={setAddr('street')} />
            </label>
            <label className="field">
              <span>Town / city *</span>
              <input value={form.address.city} placeholder="e.g. Madikeri" onChange={setAddr('city')} {...errorProps(errors, 'address.city')} />
              <FieldError id={errorId('address.city')} message={errors['address.city']} />
            </label>
            <label className="field">
              <span>State / UT *</span>
              <select value={form.address.state} onChange={setAddr('state')} {...errorProps(errors, 'address.state')}>
                <option value="">Choose…</option>
                {INDIAN_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
              <FieldError id={errorId('address.state')} message={errors['address.state']} />
            </label>
            <label className="field">
              <span>PIN code *</span>
              <input inputMode="numeric" value={form.address.pincode} placeholder="560038" onChange={setAddr('pincode')} {...errorProps(errors, 'address.pincode')} />
              <FieldError id={errorId('address.pincode')} message={errors['address.pincode']} />
            </label>
            <label className="field">
              <span>Country</span>
              <input value="India" disabled />
            </label>
          </div>
          <div aria-describedby={errorId('location')} tabIndex={-1}>
            <LocationPicker
              value={form.location}
              address={form.address}
              onChange={(location) => {
                clear('location');
                setForm((f) => ({ ...f, location }));
              }}
            />
          </div>
          <FieldError id={errorId('location')} message={errors.location || errors['location.lat'] || errors['location.lng']} />
        </section>

        <section className="card form-section">
          <label className="checkbox">
            <input type="checkbox" checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            Listed (visible in search and bookable once approved)
          </label>
        </section>

        <div className="row gap">
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Submit for review'}
          </button>
          <Link to="/host?tab=listings" className="btn btn-link">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
