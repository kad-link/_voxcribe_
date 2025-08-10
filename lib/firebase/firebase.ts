import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";



const firebaseConfig = {
  apiKey: "AIzaSyDasmT6oIFDWj5YH6PXVwIbLlz2jDQEIMw",
  authDomain: "vfour-b2e4a.firebaseapp.com",
  projectId: "vfour-b2e4a",
  storageBucket: "vfour-b2e4a.firebasestorage.app",
  messagingSenderId: "935338664920",
  appId: "1:935338664920:web:4a4f5914cc686b9c2cc8ad"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

