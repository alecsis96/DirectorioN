// Configuración de Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCQBuPjyaRFGIjSUAQw5DX-GLnBzXvzX7Y",
  authDomain: "directorion-48816.firebaseapp.com",
  projectId: "directorion-48816",
  storageBucket: "directorion-48816.firebasestorage.app",
  messagingSenderId: "478352980847",
  appId: "1:478352980847:web:72ee85f600b3d545e8069a",
  measurementId: "G-N8JP43J81V"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
