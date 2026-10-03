import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Spinner from './components/Spinner.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';

// Route-level code splitting: these pages (and the map/date-picker libraries
// they pull in) are only downloaded when the user navigates to them.
const ListingDetail = lazy(() => import('./pages/ListingDetail.jsx'));
const Trips = lazy(() => import('./pages/Trips.jsx'));
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation.jsx'));
const HostDashboard = lazy(() => import('./pages/host/HostDashboard.jsx'));
const ListingForm = lazy(() => import('./pages/host/ListingForm.jsx'));
const ListingCalendar = lazy(() => import('./pages/host/ListingCalendar.jsx'));
const Wishlist = lazy(() => import('./pages/Wishlist.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Invoice = lazy(() => import('./pages/Invoice.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="app">
      <ScrollToTop />
      <Navbar />
      <main className="main">
        <Suspense fallback={<Spinner full />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/listings/:id" element={<ListingDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/trips" element={<Trips />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/bookings/:id" element={<BookingConfirmation />} />
              <Route path="/bookings/:id/invoice" element={<Invoice />} />
              <Route path="/host" element={<HostDashboard />} />
            </Route>

            <Route element={<ProtectedRoute role="host" />}>
              <Route path="/host/listings/new" element={<ListingForm />} />
              <Route path="/host/listings/:id/edit" element={<ListingForm />} />
              <Route path="/host/listings/:id/calendar" element={<ListingCalendar />} />
            </Route>

            <Route element={<ProtectedRoute role="admin" />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
