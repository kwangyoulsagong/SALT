import { useCallback, useEffect, useRef } from "react";
import messageEventBus from "../MessageEventBus";
import type { EventName, EventPayloadMap } from "../events/registry";
import type { EventMessage } from "../types/type";

export const useMessageEventBus = () => {
  // 메시지 발행 함수
  const publish = useCallback(
    <TEventName extends EventName>(
      messageType: TEventName,
      payload: EventPayloadMap[TEventName]
    ) => {
      messageEventBus.publish(messageType, payload);
    },
    []
  );

  // 메시지 구독 훅
  const useSubscription = <TEventName extends EventName>(
    messageType: TEventName,
    callback: (data: EventPayloadMap[TEventName]) => void
  ) => {
    // callback 참조 안정화
    const callbackRef = useRef(callback);

    // callback이 변경될 때마다 참조 업데이트
    useEffect(() => {
      callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
      if (!callbackRef.current) return;

      const wrappedCallback = (message: EventMessage<TEventName>) => {
        callbackRef.current(message.payload);
      };

      const unsubscribe = messageEventBus.subscribe(
        messageType,
        wrappedCallback
      );

      return () => {
        unsubscribe();
      };
    }, [messageType]);
  };

  // 마지막 이벤트 가져오기
  const getLastEvent = useCallback(
    <TEventName extends EventName>(
      messageType: TEventName
    ): EventPayloadMap[TEventName] | undefined => {
      const event = messageEventBus.getLastEvent(messageType);
      return event ? event.payload : undefined;
    },
    []
  );

  // 마지막 이벤트 초기화
  const clearLastEvent = useCallback((messageType: EventName) => {
    messageEventBus.clearLastEvent(messageType);
  }, []);

  return {
    publish,
    useSubscription,
    getLastEvent,
    clearLastEvent,
  };
};

export default useMessageEventBus;
