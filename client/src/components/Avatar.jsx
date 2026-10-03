import { useState } from 'react';

/** Profile picture with an initial-letter fallback. */
export default function Avatar({ user, size = 32 }) {
  const [broken, setBroken] = useState(false);
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || '?';
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };

  if (user?.avatar && !broken) {
    return (
      <img
        className="avatar avatar-img"
        src={user.avatar}
        alt=""
        style={style}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }
  return <span className="avatar" style={style} aria-hidden="true">{initial}</span>;
}
