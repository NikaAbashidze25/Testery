
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  "projectId": "testlink-gjo72",
  "appId": "1:244990408299:web:57e873acb156eeb2a1232e",
  "storageBucket": "testlink-gjo72.firebasestorage.app",
  "apiKey": "AIzaSyAm-xOuRqzq5aut7ptsAWwp8Q8riB--kAY",
  "authDomain": "testlink-gjo72.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "244990408299"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');


export { app, auth, db, storage, googleProvider };
