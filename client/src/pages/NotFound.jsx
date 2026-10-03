import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';

export default function NotFound() {
  return (
    <div className="container page">
      <EmptyState
        icon="🧭"
        title="Page not found"
        message="We can’t seem to find the page you’re looking for."
        action={<Link to="/" className="btn btn-dark">Back to home</Link>}
      />
    </div>
  );
}
