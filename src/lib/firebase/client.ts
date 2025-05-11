
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// Log for debugging missing config
if (!firebaseConfig.apiKey) {
  console.error("Firebase API Key is missing. Check your .env file and ensure NEXT_PUBLIC_FIREBASE_API_KEY is set.");
}
if (!firebaseConfig.authDomain) {
    console.error("Firebase Auth Domain is missing. Check your .env file and ensure NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is set.");
}
if (!firebaseConfig.projectId) {
    console.error("Firebase Project ID is missing. Check your .env file and ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set.");
}


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };

