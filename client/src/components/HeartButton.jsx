import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getErrorMessage } from '../api/client.js';
import { HeartIcon } from './Icons.jsx';

/** Save/unsave a listing. Logged-out users are sent to log in first. */
export default function HeartButton({ listingId, variant = 'overlay' }) {
  const { user, isSaved, toggleWishlist } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const saved = isSaved(listingId);

  const onClick = async (e) => {
    e.preventDefault(); // the button sits inside a card <Link>
    e.stopPropagation();
    if (!user) {
      toast.info('Log in to save stays to your wishlist');
      navigate('/login', { state: { from: location } });
      return;
    }
    try {
      const nowSaved = await toggleWishlist(listingId);
      toast.success(nowSaved ? 'Saved to your wishlist' : 'Removed from your wishlist');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update wishlist'));
    }
  };

  if (variant === 'text') {
    return (
      <button type="button" className="btn btn-ghost" onClick={onClick} aria-pressed={saved}>
        <span className={saved ? 'heart-text saved' : 'heart-text'} aria-hidden="true">{saved ? '♥' : '♡'}</span>
        {saved ? 'Saved' : 'Save'}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={saved ? 'heart-btn saved' : 'heart-btn'}
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
    >
      <HeartIcon filled={saved} width={24} height={24} />
    </button>
  );
}
