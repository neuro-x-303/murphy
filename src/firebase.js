import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  increment,
  onSnapshot
} from "firebase/firestore";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB6Uhyp8cywPDKeYjXA6jUSjR_GkCCoLHo",
  authDomain: "murphyai.firebaseapp.com",
  projectId: "murphyai",
  storageBucket: "murphyai.firebasestorage.app",
  messagingSenderId: "1039163612348",
  appId: "1:1039163612348:web:39f4239a2fe2bdeb99c4b9",
  measurementId: "G-7Y5MPZT10H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/**
 * Saves a message/inquiry sent by a user to Firestore.
 * @param {string} name 
 * @param {string} email 
 * @param {string} text 
 */
export async function addMessageToMurphy(name, email, text) {
  try {
    const docRef = await addDoc(collection(db, "messages"), {
      name,
      email,
      text,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error writing message to Firestore:", error);
    throw error;
  }
}

/**
 * Adds an email to the waitlist/newsletter subscription in Firestore.
 * @param {string} email 
 */
export async function addWaitlistSubscriber(email) {
  try {
    const docRef = await addDoc(collection(db, "waitlist"), {
      email,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error writing subscriber to Firestore:", error);
    throw error;
  }
}

/**
 * Increments the global chaos mitigation counter by 1.
 * If the stats document does not exist, it initializes it.
 */
export async function incrementMitigationsCount() {
  const statsDocRef = doc(db, "system_status", "global_stats");
  try {
    const docSnap = await getDoc(statsDocRef);
    if (!docSnap.exists()) {
      // Initialize if not present
      await setDoc(statsDocRef, {
        mitigationsCount: 1,
        lastUpdated: serverTimestamp()
      });
    } else {
      await updateDoc(statsDocRef, {
        mitigationsCount: increment(1),
        lastUpdated: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error incrementing mitigations count:", error);
    throw error;
  }
}

/**
 * Sets up a real-time listener for the global stats document.
 * @param {function} callback Called with the statistics object.
 * @returns {function} Unsubscribe function.
 */
export function listenToGlobalStats(callback) {
  const statsDocRef = doc(db, "system_status", "global_stats");
  
  return onSnapshot(statsDocRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      // Default fallback if document hasn't been created yet
      callback({ mitigationsCount: 0 });
    }
  }, (error) => {
    console.error("Error listening to global stats:", error);
  });
}
/**
 * Signs up a new user with email, password, and name, and creates a profile document in Firestore.
 */
export async function signUpUser(email, password, name) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  try {
    if (name) {
      await updateProfile(user, { displayName: name });
    }
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      name: name || "",
      createdAt: serverTimestamp(),
      status: "active"
    });
    
    // Send email verification
    await sendEmailVerification(user);
  } catch (error) {
    console.error("Error saving user profile to Firestore:", error);
    throw error;
  }
  
  return userCredential;
}

/**
 * Signs in user with Google and saves profile to Firestore if new.
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Ensure user profile exists in Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || "",
        createdAt: serverTimestamp(),
        status: "active"
      });
    }
    return result;
  } catch (error) {
    console.error("Error during Google Sign In:", error);
    throw error;
  }
}

/**
 * Signs in an existing user with email and password.
 */
export function signInUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Signs out the currently authenticated user.
 */
export function signOutUser() {
  return signOut(auth);
}

/**
 * Subscribes to changes in the user's sign-in state.
 */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Sends a password reset email to the given email address.
 */
export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export { db, auth };
