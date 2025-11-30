import { Request, Response } from 'express';
import { getCollection } from '../database';

export async function handleDatabaseStats(req: Request, res: Response): Promise<void> {
  try {
    // Get document counts for each collection
    const studentsCollection = getCollection('students');
    const teachersCollection = getCollection('teachers');
    const principalsCollection = getCollection('principals');
    
    const [studentsCount, teachersCount, principalsCount] = await Promise.all([
      studentsCollection.estimatedDocumentCount(),
      teachersCollection.estimatedDocumentCount(),
      principalsCollection.estimatedDocumentCount()
    ]);
    
    // Get sample data (without passwords) from each collection
    const sampleStudents = await studentsCollection.find({}, { 
      projection: { password: 0 }, 
      limit: 5 
    }).toArray();
    
    const sampleTeachers = await teachersCollection.find({}, { 
      projection: { password: 0 }, 
      limit: 5 
    }).toArray();
    
    const samplePrincipals = await principalsCollection.find({}, { 
      projection: { password: 0 }, 
      limit: 5 
    }).toArray();
    
    res.status(200).json({
      message: 'Database statistics retrieved successfully',
      database: 'attendanceDB',
      statistics: {
        students: {
          count: studentsCount,
          sampleData: sampleStudents
        },
        teachers: {
          count: teachersCount,
          sampleData: sampleTeachers
        },
        principals: {
          count: principalsCount,
          sampleData: samplePrincipals
        }
      },
      totalUsers: studentsCount + teachersCount + principalsCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unable to retrieve database statistics'
    });
  }
}

export async function handleUsersByCollection(req: Request, res: Response): Promise<void> {
  try {
    const { collection } = req.params;
    
    if (!['students', 'teachers', 'principals'].includes(collection)) {
      res.status(400).json({
        error: 'Invalid Collection',
        message: 'Collection must be one of: students, teachers, principals'
      });
      return;
    }
    
    const targetCollection = getCollection(collection);
    const users = await targetCollection.find({}, { 
      projection: { password: 0 } // Exclude passwords
    }).toArray();
    
    res.status(200).json({
      message: `${collection} retrieved successfully`,
      collection,
      count: users.length,
      users,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Error retrieving ${req.params.collection}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Unable to retrieve ${req.params.collection}`
    });
  }
}
