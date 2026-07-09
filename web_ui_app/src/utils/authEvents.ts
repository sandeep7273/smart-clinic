/**
 * Auth Event Emitter – app-wide logout on 401 errors
 */

type AuthEventListener = () => void;

class AuthEventEmitter {
  private listeners: AuthEventListener[] = [];

  subscribe(listener: AuthEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emitAuthError() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error("Error in auth event listener:", error);
      }
    });
  }

  clearListeners() {
    this.listeners = [];
  }
}

export const authEvents = new AuthEventEmitter();
