import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(env.mongoUri);
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

/**
 * Transactions need a replica set (MongoDB Atlas always is one).
 * A plain local `mongod` is standalone, so we detect support once and
 * fall back to non-transactional writes when it is missing.
 */
let txSupport;
export async function supportsTransactions() {
  if (txSupport !== undefined) return txSupport;
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    txSupport = Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch {
    txSupport = false;
  }
  return txSupport;
}
