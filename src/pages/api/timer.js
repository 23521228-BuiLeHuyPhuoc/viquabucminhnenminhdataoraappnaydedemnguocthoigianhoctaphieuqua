import { getDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  try {
    const db = await getDatabase();
    const collection = db.collection('flow_state');

    if (req.method === 'GET') {
      const doc = await collection.findOne({ _id: 'user_flow_data' });
      return res.status(200).json({
        success: true,
        data: doc?.data || null,
        updatedAt: doc?.updatedAt || null,
      });
    }

    if (req.method === 'POST') {
      const { data } = req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ.' });
      }

      const now = new Date();
      await collection.updateOne(
        { _id: 'user_flow_data' },
        {
          $set: {
            data,
            updatedAt: now,
          },
        },
        { upsert: true }
      );

      return res.status(200).json({
        success: true,
        savedAt: now,
      });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (err) {
    console.error('Lỗi API MongoDB /api/timer:', err);
    return res.status(500).json({
      success: false,
      error: `Lỗi kết nối cơ sở dữ liệu: ${err.message}`,
    });
  }
}
