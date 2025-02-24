import { useCallback, useEffect } from "react";
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
    useEffect(() => {
      if (!callback) return;
      const wrappedCallback = (message: any) => {
        callback(message.payload);
      };
      const unsubscribe = messageEventBus.subscribe<T>(
        messageType,
        wrappedCallback
      );
      return () => unsubscribe();
    }, [messageType, callback]);
  };
  return {
    publish,
    useSubscription,
  };
};
export default useMessageEventBus;
