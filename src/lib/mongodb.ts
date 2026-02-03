export { connectMongo } from './mongoose';
import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

// Use globalThis for better serverless compatibility
const getCached = (): MongooseCache => {
  if (typeof globalThis !== 'undefined') {
    if (!globalThis.mongoose) {
      globalThis.mongoose = { conn: null, promise: null };
    }
    return globalThis.mongoose;
  }
  // Fallback for environments without globalThis
  if (typeof global !== 'undefined') {
    if (!global.mongoose) {
      global.mongoose = { conn: null, promise: null };
    }
    return global.mongoose;
  }
  return { conn: null, promise: null };
};

async function dbConnect(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI || '';
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  const cached = getCached();

  // Check if mongoose is already connected (readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting)
  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    return mongoose;
  }

  // Return existing connection if available
  if (cached.conn && (mongoose.connection.readyState as number) === 1) {
    return cached.conn;
  }

  // Reuse existing promise if connection is in progress
  if (cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  // Create new connection
  const opts = {
    bufferCommands: false,
  };
  let uri = MONGODB_URI;
  const uriParts = uri.split('?');
  const baseUri = uriParts[0];
  const queryString = uriParts[1] || '';
  if (baseUri.endsWith('/') || !baseUri.match(/\/[^\/]+$/)) {
    uri = baseUri.replace(/\/$/, '') + '/pj_website_ban_hoa' + (queryString ? '?' + queryString : '');
  }

  cached.promise = mongoose.connect(uri, opts).then((m) => {
    cached.conn = m;
    return m;
  });

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;

