import mongoose from 'mongoose';
import { Booking } from '../models/Booking.js';
import { Counter } from '../models/Counter.js';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ACCOMMODATION_SAC, round2 } from '../utils/gst.js';
import { amountInWords, financialYear } from '../utils/indianFormat.js';

const PLATFORM = {
  name: process.env.PLATFORM_NAME || 'Staybnb (student project)',
  address: process.env.PLATFORM_ADDRESS || 'Bengaluru, Karnataka 560001, India',
  gstin: process.env.PLATFORM_GSTIN || '', // leave empty unless you really have one
};

/**
 * Gives a booking a sequential invoice number the first time it's needed:
 *   STB/2026-27/00001, STB/2026-27/00002, …  (series restarts every financial year)
 * The conditional update means two simultaneous requests can't both assign a number.
 */
async function ensureInvoiceNumber(booking) {
  if (booking.invoiceNumber) return booking;
  const issuedOn = booking.paidAt || booking.createdAt || new Date();
  const fy = financialYear(issuedOn);
  const seq = await Counter.next(`invoice-${fy}`);
  const invoiceNumber = `STB/${fy}/${String(seq).padStart(5, '0')}`;

  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, invoiceNumber: { $exists: false } },
    { $set: { invoiceNumber, invoiceDate: new Date() } },
    { new: true }
  );
  return updated || Booking.findById(booking._id); // someone else won the race
}

// GET /api/bookings/:id/invoice   (guest, host of the listing, or admin)
export const getInvoice = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('That booking link looks broken');
  let booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');

  const allowed =
    booking.guest.equals(req.user._id) || booking.host.equals(req.user._id) || req.user.role === 'admin';
  if (!allowed) throw ApiError.forbidden('You can only view invoices for your own bookings');

  if (booking.status !== 'confirmed') {
    throw ApiError.badRequest(
      booking.status === 'pending'
        ? 'The invoice will be available once payment is complete'
        : 'Cancelled bookings don’t have an invoice',
      { code: ERROR_CODES.INVOICE_NOT_AVAILABLE }
    );
  }

  booking = await ensureInvoiceNumber(booking);
  await booking.populate([
    { path: 'listing', select: 'title address' },
    { path: 'guest', select: 'name email phone' },
    { path: 'host', select: 'name hostVerification.legalName hostVerification.status' },
  ]);

  const gst = booking.gst || {};
  const nightsTotal = round2(booking.pricePerNight * booking.nights);
  const accRate = gst.accommodationRate || 0;
  const lines = [
    {
      description: `Accommodation – ${booking.listing?.title || 'Listing'} (${booking.nights} night${booking.nights > 1 ? 's' : ''} × ₹${booking.pricePerNight.toLocaleString('en-IN')})`,
      sac: ACCOMMODATION_SAC,
      taxable: nightsTotal,
      rate: accRate,
      tax: round2((nightsTotal * accRate) / 100),
    },
  ];
  if (booking.cleaningFee > 0) {
    lines.push({
      description: 'Cleaning fee (part of the accommodation supply)',
      sac: ACCOMMODATION_SAC,
      taxable: booking.cleaningFee,
      rate: accRate,
      tax: round2((booking.cleaningFee * accRate) / 100),
    });
  }
  lines.push({
    description: 'Platform service fee',
    sac: '',
    taxable: booking.serviceFee,
    rate: gst.serviceFeeRate || 0,
    tax: gst.serviceFee || 0,
  });

  const taxableTotal = round2(lines.reduce((s, l) => s + l.taxable, 0));
  const state = booking.listing?.address?.state || '';

  res.json({
    invoice: {
      number: booking.invoiceNumber,
      date: booking.invoiceDate,
      bookingId: booking._id,
      confirmationCode: String(booking._id).slice(-8).toUpperCase(),
      seller: PLATFORM,
      host: {
        name: booking.host?.hostVerification?.legalName || booking.host?.name,
        verified: booking.host?.hostVerification?.status === 'verified',
      },
      billedTo: { name: booking.guest?.name, email: booking.guest?.email, phone: booking.guest?.phone || '' },
      stay: {
        title: booking.listing?.title,
        address: booking.listing?.address,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        guests: booking.guests,
      },
      placeOfSupply: state, // accommodation is taxed where the property is
      lines,
      totals: {
        taxable: taxableTotal,
        cgst: gst.cgst || 0,
        sgst: gst.sgst || 0,
        gst: gst.total || 0,
        grandTotal: booking.totalPrice,
        inWords: amountInWords(booking.totalPrice),
      },
      payment: {
        status: booking.paymentStatus,
        paidAt: booking.paidAt,
        method: booking.paymentStatus === 'paid' ? 'Card (Stripe)' : 'Pay at property / demo',
      },
    },
  });
});
