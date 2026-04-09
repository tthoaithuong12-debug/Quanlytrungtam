import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch, collection } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  console.log("Starting DB migration to Firebase...");
  
  if (!fs.existsSync("db.json")) {
    console.log("db.json not found!");
    return;
  }
  
  const data = JSON.parse(fs.readFileSync("db.json", "utf-8"));
  let batch = writeBatch(db);
  let opCount = 0;

  const commitBatchIfNeeded = async () => {
    if (opCount >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
      console.log("- Committed batch of 400");
    }
  };

  const collections = ['students', 'teachers', 'classes', 'lessons', 'transactions', 'monthlyBills', 'users'];
  
  for (const col of collections) {
    if (data[col] && Array.isArray(data[col])) {
      console.log(`Migrating ${col} (${data[col].length} items)...`);
      for (const item of data[col]) {
        if (!item.id) continue;
        const docRef = doc(collection(db, col), item.id);
        batch.set(docRef, item);
        opCount++;
        await commitBatchIfNeeded();
      }
    }
  }

  if (data.settings) {
    console.log(`Migrating settings...`);
    const settingsRef = doc(db, 'settings', 'global');
    batch.set(settingsRef, data.settings);
    opCount++;
    await commitBatchIfNeeded();
  }

  if (opCount > 0) {
    await batch.commit();
  }

  console.log("Migration completed successfully!");
}

migrate().catch(console.error);
