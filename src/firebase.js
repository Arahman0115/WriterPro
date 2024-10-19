import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // Import GoogleAuthProvider
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDwHbnjsEUFVFbczxeWEffyxfM2q-9Yke4",
    authDomain: "writerpro-fdbdf.firebaseapp.com",
    projectId: "writerpro-fdbdf",
    storageBucket: "writerpro-fdbdf.appspot.com",
    messagingSenderId: "952360616012",
    appId: "1:952360616012:web:0172ef43ba737b258834e9",
    measurementId: "G-EFXV6FWKQM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider(); // Export GoogleAuthProvider
