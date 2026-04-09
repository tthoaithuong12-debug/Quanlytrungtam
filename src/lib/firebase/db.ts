import { collection, getDocs, doc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./config";
import { AppData, Student, Teacher, Class, Lesson, Transaction, MonthlyBill, User } from "../../types";

export const FirebaseDB = {
  async fetchAllData(): Promise<AppData> {
    const data: AppData = {
      students: [],
      teachers: [],
      classes: [],
      lessons: [],
      transactions: [],
      monthlyBills: [],
      users: [],
      settings: {
        currency: "VND",
        theme: "light",
        centerName: "English Center",
        aiModel: "gemini-3-flash"
      }
    };

    const collections = ['students', 'teachers', 'classes', 'lessons', 'transactions', 'monthlyBills', 'users'];
    
    // Fail fast with a 5 second timeout to prevent the 30s hang if Firebase is unreachable
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Firebase connection timeout")), 5000)
    );

    const fetchPromise = (async () => {
      const promises = collections.map(async (col) => {
        const snap = await getDocs(collection(db, col));
        return { col, data: snap.docs.map(doc => doc.data()) };
      });

      const results = await Promise.all(promises);
      results.forEach(({ col, data: colData }) => {
        (data as any)[col] = colData;
      });

      const settingsSnap = await getDocs(collection(db, 'settings'));
      if (!settingsSnap.empty) {
        data.settings = settingsSnap.docs[0].data() as AppData['settings'];
      }
      return data;
    })();

    return Promise.race([fetchPromise, timeoutPromise]);
  },

  async saveAllData(data: AppData): Promise<void> {
    const batch = writeBatch(db);

    const updateCollection = (colName: string, items: any[]) => {
      items.forEach(item => {
        if (!item.id) return;
        const docRef = doc(db, colName, item.id);
        batch.set(docRef, item, { merge: true });
      });
    };

    updateCollection('students', data.students);
    updateCollection('teachers', data.teachers);
    updateCollection('classes', data.classes);
    updateCollection('lessons', data.lessons);
    updateCollection('transactions', data.transactions);
    if (data.monthlyBills) updateCollection('monthlyBills', data.monthlyBills);
    if (data.users && data.users.length > 0) updateCollection('users', data.users);
    
    const settingsRef = doc(db, 'settings', 'global');
    batch.set(settingsRef, data.settings, { merge: true });

    await batch.commit();
  }
};
