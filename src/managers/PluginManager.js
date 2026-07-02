/**
 * Plugin Manager Module
 * Manages modular platform plugins (GitHub, Vercel, Netlify, etc.) dynamically.
 * Keeps platform integrations isolated, storing metadata in Firestore.
 * 
 * Added to govern dynamic third-party credentials linkage.
 */

import { db, auth } from "../firebase";
import { doc, getDocs, collection, query, where, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { LoggingManager } from "./LoggingManager";
import { secureBase64Encode } from "../core/MurphyCore";

class PluginManagerService {
  constructor() {
    this.supportedPlugins = [
      { id: "github", name: "GitHub Connector", category: "vcs", description: "Connect repositories, browse files, and push commits." },
      { id: "vercel", name: "Vercel Deployments", category: "hosting", description: "Monitor deployment history, builds and environment variables." },
      { id: "netlify", name: "Netlify Pipelines", category: "hosting", description: "Deploy frontends to Netlify servers dynamically." }
    ];
  }

  /**
   * Get all platform integrations supported by Murphy
   */
  getSupportedPlugins() {
    return this.supportedPlugins;
  }

  /**
   * Loads connected developer integrations for the authenticated session
   */
  async getConnectedPlugins() {
    const user = auth.currentUser;
    if (!user) return [];

    try {
      const q = query(
        collection(db, "connected_accounts"),
        where("userId", "==", user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error("PluginManager: Failed to fetch connected accounts", err);
      return [];
    }
  }

  /**
   * Save a connected platform credential profile securely (base64 token masking for demo integration safety)
   * @param {string} platform - 'github' | 'vercel'
   * @param {string} username - User profile identification on target platform
   * @param {string} token - Secret API key/Personal Access Token
   */
  async connectPlugin(platform, username, token) {
    const user = auth.currentUser;
    if (!user) throw new Error("Authentication session is required.");

    const pluginMeta = this.supportedPlugins.find(p => p.id === platform);
    if (!pluginMeta) throw new Error(`Platform plugin ${platform} is not supported.`);

    // Mock encryption wrapper
    const maskedCredential = secureBase64Encode(token);
    const connectionDocId = `${user.uid}_${platform}`;

    try {
      const docRef = doc(db, "connected_accounts", connectionDocId);
      await setDoc(docRef, {
        userId: user.uid,
        platform,
        username,
        maskedCredential,
        connectedAt: serverTimestamp()
      });

      await LoggingManager.log(
        "plugin_connected",
        `Successfully linked ${pluginMeta.name} profile (${username}).`,
        "info",
        { platform, username }
      );
    } catch (err) {
      console.error(`PluginManager: Failed to link platform credentials for ${platform}`, err);
      throw err;
    }
  }

  /**
   * Removes a connected integration
   * @param {string} platform - 'github' | 'vercel'
   */
  async disconnectPlugin(platform) {
    const user = auth.currentUser;
    if (!user) return;

    const connectionDocId = `${user.uid}_${platform}`;

    try {
      const docRef = doc(db, "connected_accounts", connectionDocId);
      await deleteDoc(docRef);

      await LoggingManager.log(
        "plugin_disconnected",
        `Disconnected ${platform} profile integration.`,
        "warning",
        { platform }
      );
    } catch (err) {
      console.error(`PluginManager: Failed to disconnect integration for ${platform}`, err);
      throw err;
    }
  }
}

export const PluginManager = new PluginManagerService();
