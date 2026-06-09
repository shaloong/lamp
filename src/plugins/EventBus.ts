// ============================================================
// LAMP Plugin System — Event Bus
// Pub/sub system for decoupled communication between plugins
// and between plugins and the host.
// ============================================================

type EventHandler<T = unknown> = (data: T) => void;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private onceHandlers = new Map<string, EventHandler[]>();

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);
    // Return an unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event for only the first emission.
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): void {
    if (!this.onceHandlers.has(event)) {
      this.onceHandlers.set(event, []);
    }
    this.onceHandlers.get(event)!.push(handler as EventHandler);
  }

  /**
   * Unsubscribe from an event.
   */
  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    this.handlers.get(event)?.delete(handler as EventHandler);
  }

  /**
   * Emit an event to all subscribers.
   */
  emit<T = unknown>(event: string, data?: T): void {
    // Regular handlers
    for (const h of this.handlers.get(event) ?? []) {
      try {
        h(data);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    }
    // Once handlers
    const once = this.onceHandlers.get(event) ?? [];
    this.onceHandlers.delete(event);
    for (const h of once) {
      try {
        h(data);
      } catch (err) {
        console.error(`[EventBus] Error in once-handler for "${event}":`, err);
      }
    }
  }

  /**
   * Remove all listeners for a specific event, or all events if no event is provided.
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event);
      this.onceHandlers.delete(event);
    } else {
      this.handlers.clear();
      this.onceHandlers.clear();
    }
  }

  /**
   * Returns the number of handlers subscribed to an event.
   */
  listenerCount(event?: string): number {
    if (event) {
      return (this.handlers.get(event)?.size ?? 0) + (this.onceHandlers.get(event)?.length ?? 0);
    }
    let count = 0;
    for (const set of this.handlers.values()) count += set.size;
    for (const arr of this.onceHandlers.values()) count += arr.length;
    return count;
  }
}
