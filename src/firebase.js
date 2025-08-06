import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC3h_2Wxy4ynAHDc6mRzEL2e0Yuuqp8eX4",
  authDomain: "nplq-revision.firebaseapp.com",
  projectId: "nplq-revision",
  storageBucket: "nplq-revision.firebasestorage.app",
  messagingSenderId: "405680488962",
  appId: "1:405680488962:web:148d1c2eed4d2b6e95dd1b",
  measurementId: "G-1VPKBLDRVK",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
