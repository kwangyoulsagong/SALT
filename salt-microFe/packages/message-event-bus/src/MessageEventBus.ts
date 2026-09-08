import type { EventName, EventPayloadMap } from "./events/registry";
import type { EventCallback, EventMessage } from "./types/type";

/** MFE 간 singleton 공유를 위해 window에 보관하는 인스턴스 슬롯. */
type MessageEventBusGlobal = Window &
  typeof globalThis & {
    __MESSAGE_EVENT_BUS_INSTANCE__?: MessageEventBus;
  };

/** 브라우저에서만 global scope를 돌려준다. SSR에서는 undefined. */
const getBrowserGlobal = (): MessageEventBusGlobal | undefined =>
  typeof window === "undefined" ? undefined : (window as MessageEventBusGlobal);

class MessageEventBus {
  private subscribers: Map<EventName, Set<EventCallback>>;
  private lastEvents: Map<EventName, EventMessage>;
  private static instance: MessageEventBus;

  private constructor() {
    this.subscribers = new Map();
    this.lastEvents = new Map();

    // 브라우저 환경에서 window 객체에 인스턴스 저장
    const browserGlobal = getBrowserGlobal();
    if (browserGlobal) {
      browserGlobal.__MESSAGE_EVENT_BUS_INSTANCE__ = this;
    }
  }

  public static getInstance(): MessageEventBus {
    // 브라우저 환경에서 window 객체에서 인스턴스 확인
    const existingInstance = getBrowserGlobal()?.__MESSAGE_EVENT_BUS_INSTANCE__;
    if (existingInstance) {
      return existingInstance;
    }

    if (!MessageEventBus.instance) {
      MessageEventBus.instance = new MessageEventBus();
    }
    return MessageEventBus.instance;
  }

  public subscribe<TEventName extends EventName>(
    eventType: TEventName,
    callback: EventCallback<TEventName>
  ): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback as EventCallback);

    // 구독 시 마지막 이벤트가 있으면 즉시 발행
    const lastEvent = this.lastEvents.get(eventType) as
      | EventMessage<TEventName>
      | undefined;
    if (lastEvent) {
      setTimeout(() => callback(lastEvent), 0);
    }

    return () => this.unsubscribe(eventType, callback);
  }

  public unsubscribe<TEventName extends EventName>(
    eventType: TEventName,
    callback: EventCallback<TEventName>
  ): void {
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType)!.delete(callback as EventCallback);
    }
  }

  public publish<TEventName extends EventName>(
    eventType: TEventName,
    payload: EventPayloadMap[TEventName]
  ): void {
    const message: EventMessage<TEventName> = {
      type: eventType,
      payload,
      timestamp: Date.now(),
    };

    // 마지막 이벤트 저장
    this.lastEvents.set(eventType, message);

    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType)!.forEach((callback) => {
        callback(message as EventMessage);
      });
    }
  }

  // 마지막 이벤트 조회 메서드
  public getLastEvent<TEventName extends EventName>(
    eventType: TEventName
  ): EventMessage<TEventName> | undefined {
    return this.lastEvents.get(eventType) as
      | EventMessage<TEventName>
      | undefined;
  }

  // 특정 이벤트 초기화 메서드
  public clearLastEvent(eventType: EventName): void {
    this.lastEvents.delete(eventType);
  }

  // 모든 이벤트 초기화 메서드
  public clearAllLastEvents(): void {
    this.lastEvents.clear();
  }
}

export const messageEventBus = MessageEventBus.getInstance();
export default messageEventBus;
