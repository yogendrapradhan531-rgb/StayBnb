import { api } from './client.js';

// Thin wrappers so components never hard-code URLs.

export const configApi = {
  get: () => api.get('/config').then((r) => r.data),
};

export const authApi = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  becomeHost: () => api.patch('/auth/become-host').then((r) => r.data),
};

export const usersApi = {
  updateProfile: (data) => api.patch('/users/me', data).then((r) => r.data),
  changePassword: (data) => api.patch('/users/me/password', data).then((r) => r.data),
  submitVerification: (data) => api.post('/users/me/verification', data).then((r) => r.data),
  stats: () => api.get('/users/me/stats').then((r) => r.data),
  wishlist: () => api.get('/users/me/wishlist').then((r) => r.data),
  save: (listingId) => api.post(`/users/me/wishlist/${listingId}`).then((r) => r.data),
  unsave: (listingId) => api.delete(`/users/me/wishlist/${listingId}`).then((r) => r.data),
};

export const listingsApi = {
  search: (params, signal) => api.get('/listings', { params, signal }).then((r) => r.data),
  meta: () => api.get('/listings/meta').then((r) => r.data),
  get: (id) => api.get(`/listings/${id}`).then((r) => r.data),
  availability: (id) => api.get(`/listings/${id}/availability`).then((r) => r.data),
  reviews: (id, params) => api.get(`/listings/${id}/reviews`, { params }).then((r) => r.data),
  create: (data) => api.post('/listings', data).then((r) => r.data),
  update: (id, data) => api.put(`/listings/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/listings/${id}`).then((r) => r.data),
};

export const bookingsApi = {
  create: (data) => api.post('/bookings', data).then((r) => r.data),
  mine: (params) => api.get('/bookings/me', { params }).then((r) => r.data),
  invoice: (id) => api.get(`/bookings/${id}/invoice`).then((r) => r.data),
  get: (id) => api.get(`/bookings/${id}`).then((r) => r.data),
  pay: (id) => api.post(`/bookings/${id}/pay`).then((r) => r.data),
  cancel: (id) => api.patch(`/bookings/${id}/cancel`).then((r) => r.data),
};

export const paymentsApi = {
  confirm: (sessionId) => api.get('/payments/confirm', { params: { session_id: sessionId } }).then((r) => r.data),
};

export const reviewsApi = {
  create: (data) => api.post('/reviews', data).then((r) => r.data),
  update: (id, data) => api.put(`/reviews/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/reviews/${id}`).then((r) => r.data),
};

export const hostApi = {
  listings: () => api.get('/host/listings').then((r) => r.data),
  bookings: (scope) => api.get('/host/bookings', { params: { scope } }).then((r) => r.data),
  stats: () => api.get('/host/stats').then((r) => r.data),
  analytics: (months) => api.get('/host/analytics', { params: { months } }).then((r) => r.data),
  calendar: (id, from, to) => api.get(`/host/listings/${id}/calendar`, { params: { from, to } }).then((r) => r.data),
  block: (id, data) => api.post(`/host/listings/${id}/blocks`, data).then((r) => r.data),
  unblock: (id, blockId) => api.delete(`/host/listings/${id}/blocks/${blockId}`).then((r) => r.data),
};

export const adminApi = {
  stats: () => api.get('/admin/stats').then((r) => r.data),
  listings: (params) => api.get('/admin/listings', { params }).then((r) => r.data),
  approveListing: (id) => api.patch(`/admin/listings/${id}/approve`).then((r) => r.data),
  rejectListing: (id, reason) => api.patch(`/admin/listings/${id}/reject`, { reason }).then((r) => r.data),
  verifications: (status) => api.get('/admin/verifications', { params: { status } }).then((r) => r.data),
  approveVerification: (id) => api.patch(`/admin/verifications/${id}/approve`).then((r) => r.data),
  rejectVerification: (id, reason) => api.patch(`/admin/verifications/${id}/reject`, { reason }).then((r) => r.data),
  users: (params) => api.get('/admin/users', { params }).then((r) => r.data),
  suspend: (id, reason) => api.patch(`/admin/users/${id}/suspend`, { reason }).then((r) => r.data),
  unsuspend: (id) => api.patch(`/admin/users/${id}/unsuspend`).then((r) => r.data),
};
