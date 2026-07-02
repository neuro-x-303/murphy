/**
 * Settings Manager Module
 * Manages user workspace configurations and workspace state preferences.
 * Stores preferences persistently inside Cloud Firestore.
 * 
 * Added to manage general account features, dark-mode flags, and workspace defaults.
 */

import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { LoggingManager } from "./LoggingManager";

class SettingsManagerService {
  /**
   * Default setting parameters
   */
  getDefaultSettings() {
    return {
      autoSave: true,
      editorTheme: "cyberpunk",
      notificationsEnabled: true,
      systemLogLevel: "info",
      analyticsConsent: false,
      updatedAt: null
    };
  }

  /**
   * Loads settings for the logged-in developer
   */
  async loadSettings() {
    const user = auth.currentUser;
    if (!user) return this.getDefaultSettings();

    try {
      const docRef = doc(db, "settings", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          ...this.getDefaultSettings(),
          ...docSnap.data()
        };
      } else {
        // Initialize default settings document in Firestore
        const defaults = this.getDefaultSettings();
        defaults.updatedAt = serverTimestamp();
        await setDoc(docRef, defaults);
        return defaults;
      }
    } catch (err) {
      console.error("SettingsManager: Failed to fetch settings", err);
      return this.getDefaultSettings();
    }
  }

  /**
   * Updates specific setting fields
   * @param {object} updatedFields 
   */
  async updateSettings(updatedFields) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const docRef = doc(db, "settings", user.uid);
      const fields = {
        ...updatedFields,
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, fields);
      
      // Log setting updates in the LoggingManager
      await LoggingManager.log(
        "settings_update", 
        `Updated settings: ${Object.keys(updatedFields).join(", ")}`,
        "info"
      );
    } catch (err) {
      console.error("SettingsManager: Failed to update settings in Firestore", err);
      // Attempt setDoc if document wasn't fully created
      try {
        const docRef = doc(db, "settings", user.uid);
        await setDoc(docRef, {
          ...updatedFields,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (innerErr) {
        console.error("SettingsManager: Retry write failed", innerErr);
      }
    }
  }
}

export const SettingsManager = new SettingsManagerService();
