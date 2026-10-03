import SearchBar from './SearchBar.jsx';
import { optimizeImage } from '../utils/image.js';
import { KARNATAKA_DESTINATIONS } from '../utils/india.js';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6';

// Karnataka-first quick picks (see utils/india.js)
const DESTINATIONS = KARNATAKA_DESTINATIONS;

/** Landing-page hero: big headline, full search bar and quick destination picks. */
export default function Hero({ initial, onSearch }) {
  return (
    <section className="hero">
      <div
        className="hero-bg"
        style={{ backgroundImage: `url("${optimizeImage(HERO_IMAGE, 1600)}")` }}
        aria-hidden="true"
      />
      <div className="hero-overlay" aria-hidden="true" />
      <div className="container hero-content">
        <p className="hero-eyebrow">Homestays, estates & beach huts across Karnataka</p>
        <h1 className="hero-title">
          From Coorg’s coffee estates
          <br />
          to Gokarna’s <span className="hero-accent">beaches</span>.
        </h1>
        <p className="hero-sub">
          Book verified Indian homestays with transparent ₹ pricing – GST included, invoice in one click.
        </p>

        <SearchBar initial={initial} onSearch={onSearch} variant="hero" />

        <div className="hero-destinations">
          <span className="hero-dest-label">Explore Karnataka:</span>
          {DESTINATIONS.map(([city, icon]) => (
            <button
              key={city}
              type="button"
              className="hero-chip"
              onClick={() => onSearch({ ...initial, location: city })}
            >
              <span aria-hidden="true">{icon}</span> {city}
            </button>
          ))}
        </div>

      </div>
    </section>
  );
}
