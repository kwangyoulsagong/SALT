import { EventCallbak, EventMessage } from "./types/type.js";

class MessageEventBus {
  private subscribers: Map<string, Set<EventCallbak>>;
  private lastEvents: Map<string, EventMessage<any>>;
  private static instance: MessageEventBus;

  private constructor() {
    this.subscribers = new Map();
    this.lastEvents = new Map();

    // 브라우저 환경에서 window 객체에 인스턴스 저장
    if (typeof window !== "undefined") {
      (window as any).__MESSAGE_EVENT_BUS_INSTANCE__ = this;
    }
  }

  public static getInstance(): MessageEventBus {
    // 브라우저 환경에서 window 객체에서 인스턴스 확인
    if (
      typeof window !== "undefined" &&
      (window as any).__MESSAGE_EVENT_BUS_INSTANCE__
    ) {
      return (window as any).__MESSAGE_EVENT_BUS_INSTANCE__;
    }

    if (!MessageEventBus.instance) {
      MessageEventBus.instance = new MessageEventBus();
    }
    return MessageEventBus.instance;
  }

  public subscribe<T = any>(
    eventType: string,
    callback: EventCallbak<EventMessage<T>>
  ): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback);

    // 구독 시 마지막 이벤트가 있으면 즉시 발행
    const lastEvent = this.lastEvents.get(eventType);
    if (lastEvent) {
      setTimeout(() => callback(lastEvent), 0);
    }

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

    // 마지막 이벤트 저장
    this.lastEvents.set(eventType, message);

    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType)!.forEach((callback) => {
        callback(message);
      });
    }
  }

  // 마지막 이벤트 조회 메서드
  public getLastEvent<T = any>(eventType: string): EventMessage<T> | undefined {
    return this.lastEvents.get(eventType) as EventMessage<T> | undefined;
  }

  // 특정 이벤트 초기화 메서드
  public clearLastEvent(eventType: string): void {
    this.lastEvents.delete(eventType);
  }

  // 모든 이벤트 초기화 메서드
  public clearAllLastEvents(): void {
    this.lastEvents.clear();
  }
}

export const messageEventBus = MessageEventBus.getInstance();
export default messageEventBus;
