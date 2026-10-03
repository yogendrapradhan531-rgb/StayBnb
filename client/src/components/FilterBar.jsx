import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { SlidersIcon } from './Icons.jsx';
import { capitalize } from '../utils/format.js';

const TYPE_ICONS = {
  apartment: '🏢', house: '🏠', villa: '🏝️', cabin: '🌲', cottage: '🏡', loft: '🏙️', other: '✨',
};

const SORTS = [
  ['newest', 'Newest'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['rating', 'Top rated'],
];

/**
 * Sticky category bar + "Filters" modal (price, bedrooms, amenities) + sort.
 * `values` are the current URL params; `onChange(patch)` merges into them.
 */
export default function FilterBar({ meta, values, onChange, onClear, resultCount }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(values);
  useEffect(() => setDraft(values), [values, open]);

  const amenities = draft.amenities ? draft.amenities.split(',') : [];
  const toggleAmenity = (a) => {
    const next = amenities.includes(a) ? amenities.filter((x) => x !== a) : [...amenities, a];
    setDraft((d) => ({ ...d, amenities: next.join(',') }));
  };

  const activeCount = ['state', 'minPrice', 'maxPrice', 'bedrooms', 'amenities'].filter((k) => values[k]).length;

  const apply = () => {
    onChange({
      state: draft.state,
      minPrice: draft.minPrice,
      maxPrice: draft.maxPrice,
      bedrooms: draft.bedrooms,
      amenities: draft.amenities,
    });
    setOpen(false);
  };

  return (
    <div className="filter-bar">
      <div className="container filter-row">
        <div className="categories" role="tablist" aria-label="Property type">
          <button
            type="button"
            role="tab"
            aria-selected={!values.type}
            className={!values.type ? 'category active' : 'category'}
            onClick={() => onChange({ type: '' })}
          >
            <span className="category-icon" aria-hidden="true">🌍</span>
            <span>All</span>
          </button>
          {meta.propertyTypes.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={values.type === t}
              className={values.type === t ? 'category active' : 'category'}
              onClick={() => onChange({ type: t })}
            >
              <span className="category-icon" aria-hidden="true">{TYPE_ICONS[t]}</span>
              <span>{capitalize(t)}</span>
            </button>
          ))}
        </div>

        <div className="filter-actions">
          <select
            aria-label="Sort by"
            className="select-pill"
            value={values.sort || 'newest'}
            onChange={(e) => onChange({ sort: e.target.value })}
          >
            {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
          <button type="button" className={activeCount ? 'btn btn-outline has-count' : 'btn btn-outline'} onClick={() => setOpen(true)}>
            <SlidersIcon width={16} height={16} /> Filters
            {activeCount > 0 && <span className="count-badge">{activeCount}</span>}
          </button>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        size="md"
        footer={
          <>
            <button type="button" className="btn btn-link" onClick={() => { onClear(); setOpen(false); }}>
              Clear all
            </button>
            <button type="button" className="btn btn-dark" onClick={apply}>
              Show {typeof resultCount === 'number' ? 'results' : 'stays'}
            </button>
          </>
        }
      >
        <section className="filter-group">
          <h3>State</h3>
          <select value={draft.state || ''} onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}>
            <option value="">Anywhere in India</option>
            {(meta.states || []).map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
        </section>

        <section className="filter-group">
          <h3>Price per night</h3>
          <div className="price-inputs">
            <label className="field">
              <span>Minimum</span>
              <input type="number" min="0" placeholder="Any" value={draft.minPrice || ''}
                onChange={(e) => setDraft((d) => ({ ...d, minPrice: e.target.value }))} />
            </label>
            <span className="muted">–</span>
            <label className="field">
              <span>Maximum</span>
              <input type="number" min="0" placeholder="Any" value={draft.maxPrice || ''}
                onChange={(e) => setDraft((d) => ({ ...d, maxPrice: e.target.value }))} />
            </label>
          </div>
        </section>

        <section className="filter-group">
          <h3>Bedrooms</h3>
          <div className="chips">
            {['', '1', '2', '3', '4'].map((n) => (
              <button
                key={n || 'any'}
                type="button"
                className={(draft.bedrooms || '') === n ? 'chip active' : 'chip'}
                onClick={() => setDraft((d) => ({ ...d, bedrooms: n }))}
              >
                {n ? `${n}+` : 'Any'}
              </button>
            ))}
          </div>
        </section>

        <section className="filter-group">
          <h3>Amenities</h3>
          <div className="amenity-grid">
            {meta.amenities.map((a) => (
              <label key={a} className="checkbox">
                <input type="checkbox" checked={amenities.includes(a)} onChange={() => toggleAmenity(a)} />
                {capitalize(a)}
              </label>
            ))}
          </div>
        </section>
      </Modal>
    </div>
  );
}
