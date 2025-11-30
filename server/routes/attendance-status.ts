import { Request, Response } from 'express';
import { getCollection } from '../database';

export async function handleGetAttendanceStatus(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.query as { sessionId?: string };
    if (!sessionId) {
      res.status(400).json({ error: 'Validation Error', message: 'sessionId is required' });
      return;
    }
    const attendanceCol = getCollection('attendance');
    const records = await attendanceCol.find({ sessionId }).sort({ timestamp: -1 }).toArray();
    res.status(200).json({ success: true, count: records.length, records });
  } catch (error: any) {
    console.error('❌ Attendance status fetch error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch attendance status' });
  }
}
