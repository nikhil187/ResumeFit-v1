import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

export async function saveReport(userId, reportData) {
  try {
    console.log('Saving report for user:', userId);
    const reportRef = await addDoc(collection(db, 'users', userId, 'reports'), {
      ...reportData,
      createdAt: serverTimestamp()
    });
    console.log('Report saved with ID:', reportRef.id);
    return reportRef.id;
  } catch (error) {
    console.error('Error saving report:', error);
    throw error;
  }
}

export async function getUserReports(userId) {
  try {
    console.log('Getting reports for user:', userId);
    const reportsQuery = query(
      collection(db, 'users', userId, 'reports'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(reportsQuery);
    console.log('Reports snapshot size:', snapshot.size);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
      };
    });
  } catch (error) {
    console.error('Error getting reports:', error);
    throw error;
  }
}

export async function getReport(userId, reportId) {
  try {
    console.log('Getting report:', reportId, 'for user:', userId);
    const reportDoc = await getDoc(doc(db, 'users', userId, 'reports', reportId));
    
    if (!reportDoc.exists()) {
      console.log('Report not found');
      throw new Error('Report not found');
    }
    
    const data = reportDoc.data();
    console.log('Report data retrieved');
    
    return {
      id: reportDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error('Error getting report:', error);
    throw error;
  }
}

export async function deleteReport(userId, reportId) {
  try {
    console.log('Deleting report:', reportId, 'for user:', userId);
    await deleteDoc(doc(db, 'users', userId, 'reports', reportId));
    console.log('Report deleted successfully');
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
}