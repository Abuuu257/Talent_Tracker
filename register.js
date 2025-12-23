// =======================================================
// 1. IMPORTS
// =======================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// =======================================================
// 2. CONFIGURATION
// =======================================================
const firebaseConfig = {
  apiKey: "AIzaSyBtIlIV-FGmM2hZh0NcuK78N9EafqpcGTQ",
  authDomain: "athletesystem-61615.firebaseapp.com",
  projectId: "athletesystem-61615",
  storageBucket: "athletesystem-61615.firebasestorage.app",
  messagingSenderId: "646599639422",
  appId: "1:646599639422:web:33f0f059a0e7112d9f332f"
};

// =======================================================
// 3. INITIALIZATION
// =======================================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// =======================================================
// AUTHENTICATION FUNCTIONS
// =======================================================

export async function registerUser(email, password) {
  if (!email || !password) throw new Error("Email and password required");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function loginUser(email, password) {
  if (!email || !password) throw new Error("Email and password required");
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  onAuthStateChanged(auth, callback);
}

// =======================================================
// USER / PROFILE FUNCTIONS (NEW + IMPORTANT)
// =======================================================

/**
 * Save base user account (used for login).
 * Stored in: users/{uid}
 */
export async function saveUserAccount(uid, data) {
  return setDoc(doc(db, "users", uid), {
    ...data,
    createdAt: serverTimestamp()
  });
}

/**
 * Find user by username + role.
 * Used during login.
 */
export async function getUserByUsername(username, role) {
  const q = query(
    collection(db, "users"),
    where("username", "==", username),
    where("role", "==", role)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  return {
    uid: snap.docs[0].id,
    ...snap.docs[0].data()
  };
}

// =======================================================
// ATHLETE PROFILE FUNCTIONS (UNCHANGED)
// =======================================================

export async function saveAthleteProfile(uid, profileData) {
  const athleteRef = doc(db, "athletes", uid);
  return setDoc(athleteRef, profileData, { merge: true });
}

// =======================================================
// STORAGE FUNCTIONS (UNCHANGED)
// =======================================================

export async function uploadFile(file, uid, category) {
  const filePath = `athletes/${uid}/${category}/${file.name}`;
  const storageRef = ref(storage, filePath);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

// =======================================================
// EXPORT SERVICES
// =======================================================
export { auth, db, app };
