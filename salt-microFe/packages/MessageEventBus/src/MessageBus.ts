import { EventCallbak, EventMessage } from "./types/type.js";

class MessageBus {
  private subscribers: Map<string, Set<EventCallbak>>;
  private static instance: MessageBus;
  private constructor() {
    this.subscribers = new Map();
  }

  public static getInstance(): MessageBus {
    if (!MessageBus.instance) {
      MessageBus.instance = new MessageBus();
    }
    return MessageBus.instance;
  }

  public subscribe<T = any>(
    eventType: string,
    callback: EventCallbak<EventMessage<T>>
  ): () => void {
    if (this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback);
    return () => this.unsubscribe(eventType, callback);
  }

  public unsubscribe(eventType: string, callback: EventCallbak): void {
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType)!.delete(callback);
    }
  }

  public publish<T = any>(eventType: string, payload: T): void {
    const message: EventMessage<T> = {
      type: eventType,
      payload,
      timestamp: Date.now(),
    };
  }
}
