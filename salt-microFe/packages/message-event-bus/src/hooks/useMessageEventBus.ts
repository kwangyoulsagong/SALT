import { useCallback, useEffect, useRef } from "react";
import messageEventBus from "../MessageEventBus";

export const useMessageEventBus = () => {
  // 메시지 발행 함수
  const publish = useCallback(<T = any>(messageType: string, payload: T) => {
    messageEventBus.publish(messageType, payload);
  }, []);

  // 메시지 구독 훅
  const useSubscription = <T = any>(
    messageType: string,
    callback: (data: T) => void
  ) => {
    // callback 참조 안정화
    const callbackRef = useRef(callback);

    // callback이 변경될 때마다 참조 업데이트
    useEffect(() => {
      callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
      if (!callbackRef.current) return;

      const wrappedCallback = (message: any) => {
        callbackRef.current(message.payload);
      };

      const unsubscribe = messageEventBus.subscribe<T>(
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
    <T = any>(messageType: string): T | undefined => {
      const event = messageEventBus.getLastEvent<T>(messageType);
      return event ? event.payload : undefined;
    },
    []
  );

  // 마지막 이벤트 초기화
  const clearLastEvent = useCallback((messageType: string) => {
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
