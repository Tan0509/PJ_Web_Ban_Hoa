import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import { methodNotAllowed } from '@/lib/helpers/pagesApi';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, 'error');
  }

  try {
    await dbConnect();
    
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    // Lấy danh sách collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Đếm documents trong mỗi collection
    const counts: Record<string, number> = {};
    for (const name of collectionNames) {
      counts[name] = await db.collection(name).countDocuments();
    }

    // Lấy 1 sample document từ mỗi collection
    const samples: Record<string, any> = {};
    for (const name of collectionNames) {
      const doc = await db.collection(name).findOne({});
      samples[name] = doc;
    }

    return res.status(200).json({
      success: true,
      message: 'Connected to MongoDB Atlas successfully!',
      database: db.databaseName,
      collections: collectionNames,
      documentCounts: counts,
      sampleDocuments: samples
    });
  } catch (error: any) {
    console.error('MongoDB connection error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


