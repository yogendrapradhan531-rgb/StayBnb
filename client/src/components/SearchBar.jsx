import { useEffect, useRef, useState } from 'react';
import { toISODate } from '../utils/format.js';
import { SearchIcon } from './Icons.jsx';

/**
 * Where / Check in / Check out / Who.
 * Uses native date inputs to keep the landing-page bundle small.
 * variant: 'default' | 'hero'
 */
export default function SearchBar({ initial, onSearch, variant = 'default', autoFocus = false }) {
  const [form, setForm] = useState(initial);
  const whereRef = useRef(null);
  useEffect(() => setForm(initial), [initial]);
  useEffect(() => {
    if (autoFocus) whereRef.current?.focus();
  }, [autoFocus]);

  const today = toISODate(new Date());
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const next = { ...form };
    // Drop an invalid range rather than sending it
    if (next.checkIn && next.checkOut && next.checkOut <= next.checkIn) next.checkOut = '';
    onSearch(next);
  };

  return (
    <form className={`search-bar search-${variant}`} onSubmit={submit} role="search">
      <label className="search-field grow">
        <span>Where</span>
        <input
          ref={whereRef}
          type="text"
          placeholder="Search destinations"
          value={form.location}
          onChange={set('location')}
        />
      </label>
      <label className="search-field">
        <span>Check in</span>
        <input type="date" min={today} value={form.checkIn} onChange={set('checkIn')} />
      </label>
      <label className="search-field">
        <span>Check out</span>
        <input type="date" min={form.checkIn || today} value={form.checkOut} onChange={set('checkOut')} />
      </label>
      <label className="search-field small-field">
        <span>Who</span>
        <input type="number" min="1" max="16" placeholder="Add guests" value={form.guests} onChange={set('guests')} />
      </label>
      <button type="submit" className="search-btn" aria-label="Search">
        <SearchIcon strokeWidth={3} />
        <span className="search-btn-label">Search</span>
      </button>
    </form>
  );
}
