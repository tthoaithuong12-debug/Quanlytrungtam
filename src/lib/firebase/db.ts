import { collection, getDocs, doc, setDoc, writeBatch, onSnapshot } from "firebase/firestore";
import { db } from "./config";
import { AppData, Student, Teacher, Class, Lesson, Transaction, MonthlyBill, User } from "../../types";

export const FirebaseDB = {
  listenToAllData(callback: (data: AppData) => void, onError: (err: any) => void): () => void {
    const data: AppData = {
      students: [], teachers: [], classes: [], lessons: [], transactions: [], monthlyBills: [], users: [],
      settings: { currency: "VND", theme: "light", centerName: "English Center", aiModel: "gemini-3-flash" }
    };

    const collections = ['students', 'teachers', 'classes', 'lessons', 'transactions', 'monthlyBills', 'users'];
    const unsubscribers: (() => void)[] = [];
    
    let loadedCount = 0;
    const requiredLoads = collections.length + 1; // +1 for settings
    let hasReturnedFirst = false;

    // Timeout mechanism: if after 5 seconds still not loaded, throw error to fallback
    const timer = setTimeout(() => {
      if (!hasReturnedFirst) {
        onError(new Error("Firebase connection timeout"));
      }
    }, 5000);

    const fireCallbackIfReady = () => {
      loadedCount++;
      if (loadedCount >= requiredLoads && !hasReturnedFirst) {
        hasReturnedFirst = true;
        clearTimeout(timer);
        callback({ ...data });
      }
    };

    try {
      collections.forEach(col => {
        const unsub = onSnapshot(collection(db, col), (snap) => {
          (data as any)[col] = snap.docs.map(d => d.data());
          if (!hasReturnedFirst) fireCallbackIfReady();
          else callback({ ...data });
        }, (err) => {
          if (!hasReturnedFirst) onError(err);
        });
        unsubscribers.push(unsub);
      });

      const unsubSettings = onSnapshot(collection(db, 'settings'), (snap) => {
        if (!snap.empty) {
          data.settings = snap.docs[0].data() as AppData['settings'];
        }
        if (!hasReturnedFirst) fireCallbackIfReady();
        else callback({ ...data });
      }, (err) => {
        if (!hasReturnedFirst) onError(err);
      });
      unsubscribers.push(unsubSettings);

    } catch (err) {
      if (!hasReturnedFirst) onError(err);
    }

    return () => unsubscribers.forEach(u => u());
  },

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

    const syncCollection = async (colName: string, items: any[]) => {
      // 1. Lấy tất cả docs hiện có trên Firebase
      const snapshot = await getDocs(collection(db, colName));
      const existingIds = new Set(snapshot.docs.map(d => d.id));
      const newIds = new Set(items.filter(item => item.id).map(item => item.id));

      // 2. Thêm/cập nhật tất cả items hiện tại
      items.forEach(item => {
        if (!item.id) return;
        const docRef = doc(db, colName, item.id);
        batch.set(docRef, item, { merge: true });
      });

      // 3. XÓA docs trên Firebase mà không còn trong data local
      existingIds.forEach(id => {
        if (!newIds.has(id)) {
          const docRef = doc(db, colName, id);
          batch.delete(docRef);
        }
      });
    };

    await syncCollection('students', data.students);
    await syncCollection('teachers', data.teachers);
    await syncCollection('classes', data.classes);
    await syncCollection('lessons', data.lessons);
    await syncCollection('transactions', data.transactions);
    if (data.monthlyBills) await syncCollection('monthlyBills', data.monthlyBills);
    if (data.users && data.users.length > 0) await syncCollection('users', data.users);
    
    const settingsRef = doc(db, 'settings', 'global');
    batch.set(settingsRef, data.settings, { merge: true });

    await batch.commit();
  }
};
