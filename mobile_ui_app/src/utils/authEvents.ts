/**
 * Auth Event Emitter
 * Centralized authentication event handling for app-wide logout
 */

type AuthEventListener = () => void;

class AuthEventEmitter {
  private listeners: AuthEventListener[] = [];

  /**
   * Subscribe to authentication errors (e.g., 401 responses)
   */
  subscribe(listener: AuthEventListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Emit authentication error event
   * This will trigger all subscribers to logout
   */
  emitAuthError() {
    console.log('🚨 Auth error detected - triggering logout');
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in auth event listener:', error);
      }
    });
  }

  /**
   * Clear all listeners (useful for cleanup)
   */
  clearListeners() {
    this.listeners = [];
  }
}

// Export singleton instance
export const authEvents = new AuthEventEmitter();
