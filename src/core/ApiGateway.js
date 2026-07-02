/**
 * API Gateway Client Wrapper
 * Intercepts, routes, and secures outgoing network calls.
 * Automatically injects active Firebase Authentication tokens.
 * 
 * Added to serve as the gateway route translator.
 */

import { auth } from "../firebase";

class ApiGatewayService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_BASE_URL || "/api/v1";
  }

  /**
   * Retrieves the active Firebase Auth token for headers
   */
  async getAuthHeaders() {
    const user = auth.currentUser;
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    if (user) {
      try {
        const token = await user.getIdToken();
        headers["Authorization"] = `Bearer ${token}`;
      } catch (err) {
        console.error("API Gateway: Failed to fetch auth token", err);
      }
    }
    return headers;
  }

  /**
   * Safe asynchronous request proxy
   */
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
    const authHeaders = await this.getAuthHeaders();
    
    const config = {
      ...options,
      headers: {
        ...authHeaders,
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {}
        
        throw new Error(
          errorData.message || `API Gateway Error: Received status code ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API Gateway Connection Failure [${url}]:`, error);
      throw error;
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  async post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body)
    });
  }
}

export const ApiGateway = new ApiGatewayService();
