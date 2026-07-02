/**
 * Logging Manager Module
 * Handles local and remote activity logging.
 * Streams action logs directly to the user's Firestore activity_logs collection.
 * 
 * Added to track developer pipeline actions and diagnostic reports.
 */

import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from "firebase/firestore";

class LoggingManagerService {
  /**
   * Write a new log entry to Firestore
   * @param {string} eventName - e.g., 'auth_login', 'github_push'
   * @param {string} message - Description message
   * @param {string} severity - 'info' | 'warning' | 'error'
   * @param {object} metadata - Optional context parameters
   */
  async log(eventName, message, severity = "info", metadata = {}) {
    const user = auth.currentUser;
    const userId = user ? user.uid : "unauthenticated";

    const logEntry = {
      userId,
      event: eventName,
      message,
      severity,
      metadata,
      timestamp: serverTimestamp()
    };

    // Print to developer console for realtime debugger review
    const consoleMsg = `[${severity.toUpperCase()}] Murphy Log (${eventName}): ${message}`;
    if (severity === "error") {
      console.error(consoleMsg, metadata);
    } else if (severity === "warning") {
      console.warn(consoleMsg, metadata);
    } else {
      console.log(consoleMsg, metadata);
    }

    try {
      await addDoc(collection(db, "activity_logs"), logEntry);
    } catch (err) {
      console.error("LoggingManager: Failed to post audit log entry to Firestore", err);
    }
  }

  /**
   * Retrieves log history for the authenticated user
   */
  async fetchLogs(maxLimit = 50) {
    const user = auth.currentUser;
    if (!user) return [];

    try {
      const q = query(
        collection(db, "activity_logs"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc"),
        limit(maxLimit)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error("LoggingManager: Failed to fetch activity logs", err);
      return [];
    }
  }
}

export const LoggingManager = new LoggingManagerService();
