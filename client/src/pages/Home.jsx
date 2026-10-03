import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listingsApi } from '../api/services.js';
import { getErrorMessage } from '../api/client.js';
import Hero from '../components/Hero.jsx';
import FilterBar from '../components/FilterBar.jsx';
import ListingCard, { ListingCardSkeleton } from '../components/ListingCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBox from '../components/ErrorBox.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import { ListIcon, MapIcon } from '../components/Icons.jsx';
import { formatRange, plural } from '../utils/format.js';
import { INDIAN_STATES } from '../utils/india.js';

// Leaflet is ~150 KB – load it only once the map is shown
const ListingMap = lazy(() => import('../components/ListingMap.jsx'));

const SEARCH_KEYS = ['location', 'checkIn', 'checkOut', 'guests'];
const PARAM_KEYS = [
  ...SEARCH_KEYS, 'state', 'type', 'minPrice', 'maxPrice', 'bedrooms', 'amenities', 'sort', 'page', 'bounds',
];

const DEFAULT_META = {
  propertyTypes: ['apartment', 'house', 'villa', 'cabin', 'cottage', 'loft', 'other'],
  amenities: ['wifi', 'kitchen', 'washer', 'air conditioning', 'heating', 'pool', 'free parking', 'tv', 'workspace', 'hot tub', 'pet friendly', 'beach access'],
  states: INDIAN_STATES,
};

const isDesktop = () => window.matchMedia?.('(min-width: 1024px)').matches ?? true;

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramString = searchParams.toString();

  // All search state lives in the URL → shareable, back-button friendly
  const params = useMemo(() => {
    const sp = new URLSearchParams(paramString);
    return Object.fromEntries(PARAM_KEYS.map((k) => [k, sp.get(k) || '']));
  }, [paramString]);

  const isLanding = !SEARCH_KEYS.some((k) => params[k]);

  const searchInitial = useMemo(
    () => ({ location: params.location, checkIn: params.checkIn, checkOut: params.checkOut, guests: params.guests }),
    [params]
  );

  const [meta, setMeta] = useState(DEFAULT_META);
  const [data, setData] = useState({ listings: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [hoveredId, setHoveredId] = useState(null);
  const [showMap, setShowMap] = useState(() => !isLanding && isDesktop());

  // Open the map by default once the user runs a search (on desktop)
  useEffect(() => {
    if (!isLanding && isDesktop()) setShowMap(true);
  }, [isLanding]);

  useEffect(() => {
    listingsApi.meta().then(setMeta).catch(() => {});
  }, []);

  // Fetch listings whenever the URL params change; abort stale requests
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const query = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
    listingsApi
      .search(query, controller.signal)
      .then(setData)
      .catch((err) => {
        if (err.name !== 'CanceledError') setError(getErrorMessage(err, 'Could not load listings'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [params, reloadKey]);

  const updateParams = useCallback(
    (patch) => {
      const next = { ...params, ...patch };
      if (!('page' in patch)) next.page = ''; // new filters → back to page 1
      const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v));
      setSearchParams(clean);
    },
    [params, setSearchParams]
  );

  const clearFilters = () =>
    updateParams({ state: '', type: '', minPrice: '', maxPrice: '', bedrooms: '', amenities: '', sort: '', bounds: '' });

  // Carry dates/guests to the detail page so the booking widget is prefilled
  const cardSearch = useMemo(() => {
    const sp = new URLSearchParams();
    ['checkIn', 'checkOut', 'guests'].forEach((k) => params[k] && sp.set(k, params[k]));
    const s = sp.toString();
    return s ? `?${s}` : '';
  }, [params]);

  const changePage = (page) => {
    updateParams({ page: String(page) });
    window.scrollTo({ top: isLanding ? 420 : 0, behavior: 'smooth' });
  };

  const heading = isLanding
    ? params.state ? `Explore ${params.state}` : 'Explore stays across India'
    : [
        params.location ? `Stays in ${params.location}` : params.state ? `Stays in ${params.state}` : 'Stays',
        params.checkIn && params.checkOut ? formatRange(params.checkIn, params.checkOut) : null,
      ].filter(Boolean).join(' · ');

  return (
    <div className="home">
      {isLanding && <Hero initial={searchInitial} onSearch={(s) => updateParams({ ...s, bounds: '' })} />}

      <FilterBar meta={meta} values={params} onChange={updateParams} onClear={clearFilters} resultCount={data.total} />

      <div className={showMap ? 'results with-map' : 'results'}>
        <section className="results-list">
          <div className="results-header">
            <div>
              <h2 className="results-title">{heading}</h2>
              <p className="muted small">
                {loading ? 'Searching…' : plural(data.total, 'stay')}
                {params.guests && ` · ${plural(Number(params.guests), 'guest')}`}
              </p>
            </div>
            {params.bounds && (
              <button type="button" className="chip active" onClick={() => updateParams({ bounds: '' })}>
                Map area ✕
              </button>
            )}
          </div>

          <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />

          {loading ? (
            <div className="grid">
              {Array.from({ length: 8 }, (_, i) => <ListingCardSkeleton key={i} />)}
            </div>
          ) : !error && data.listings.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No exact matches"
              message="Try changing or removing some of your filters or adjusting your search area."
              action={<button type="button" className="btn btn-dark" onClick={() => setSearchParams({})}>Remove all filters</button>}
            />
          ) : (
            <>
              <div className="grid">
                {data.listings.map((l) => (
                  <ListingCard
                    key={l._id}
                    listing={l}
                    search={cardSearch}
                    active={hoveredId === l._id}
                    onHover={setHoveredId}
                  />
                ))}
              </div>
              <Pagination page={data.page} pages={data.pages} onChange={changePage} />
            </>
          )}
        </section>

        {showMap && (
          <aside className="results-map">
            <Suspense fallback={<Spinner />}>
              <ListingMap
                listings={data.listings}
                activeId={hoveredId}
                autoFit={!params.bounds}
                onSearchArea={(bounds) => updateParams({ bounds })}
              />
            </Suspense>
          </aside>
        )}
      </div>

      {/* Floating list/map switch (Airbnb-style) */}
      <button type="button" className="map-toggle" onClick={() => setShowMap((s) => !s)}>
        {showMap ? <>Show list <ListIcon width={16} height={16} /></> : <>Show map <MapIcon width={16} height={16} /></>}
      </button>
    </div>
  );
}
