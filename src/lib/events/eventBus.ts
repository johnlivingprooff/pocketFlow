type Handler<T = any> = (payload?: T) => void;

class EventBus {
  private listeners: Map<string, Set<Handler>> = new Map();

  on<T = any>(event: string, handler: Handler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(handler as Handler);
    return () => this.off(event, handler);
  }

  off<T = any>(event: string, handler: Handler<T>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler as Handler);
      if (set.size === 0) this.listeners.delete(event);
    }
  }

  emit<T = any>(event: string, payload?: T): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of Array.from(set)) {
      try {
        handler(payload);
      } catch (e) {
        // Swallow handler errors to avoid cascading failures
      }
    }
  }
}

export const eventBus = new EventBus();
export const on = eventBus.on.bind(eventBus);
export const off = eventBus.off.bind(eventBus);
export const emit = eventBus.emit.bind(eventBus);
