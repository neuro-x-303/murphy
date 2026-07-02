/**
 * Murphy Core Module
 * Provides core state structures, environment configuration loaders, 
 * and generic platform integration contract definitions.
 * 
 * Added to serve as the unified bootstrap module for the developer workspace.
 */

export const MurphyVersion = "1.0.0-phase1";

export const SystemCapabilities = {
  vcs: ["github"],
  hosting: ["vercel"],
  database: ["firestore"],
  metrics: ["token_calls"]
};

/**
 * Interface definition for Platform Plugins.
 * Every integrated platform plugin must conform to this schema.
 */
export class BasePluginContract {
  constructor(id, name, desc) {
    this.id = id;
    this.name = name;
    this.description = desc;
  }

  // To be implemented by subclasses
  async checkConnection() {
    throw new Error("Plugin connection test must be implemented.");
  }
}

/**
 * Standard utility to decrypt client-side data (simple base64 representation for metadata safety)
 */
export function secureBase64Encode(rawString) {
  if (!rawString) return "";
  return btoa(rawString);
}

export function secureBase64Decode(encodedString) {
  if (!encodedString) return "";
  try {
    return atob(encodedString);
  } catch (e) {
    console.error("Decoder failure", e);
    return "";
  }
}
