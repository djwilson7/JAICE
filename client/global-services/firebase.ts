// import { localfiles } from "@/directory/path/to/localimport";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence, GoogleAuthProvider, updateProfile } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY!,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN!,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID!,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
    appId: import.meta.env.VITE_FIREBASE_APP_ID!,
};

// Initialize Firebase once
const app = getApps.length ? getApps()[0] : initializeApp(firebaseConfig);

// Initialize Firebase Authentication and set persistence
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { updateProfile };

// // gmail API scopes to request during sign-in
// googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
// googleProvider.addScope('https://www.googleapis.com/auth/gmail.labels');


// Persist sessions across tabs/reloads
await setPersistence(auth, browserLocalPersistence); 
