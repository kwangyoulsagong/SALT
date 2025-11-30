import { useCallback, useEffect, useRef } from "react";

const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  //예약된 타이머 저장
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  //마지막 실행된 시각
  const lastRunRef = useRef<number>(0);
  //가장 최근에 호출된 함수의 arguments 저장
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const throttled = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRunRef.current;

      if (timeSinceLastRun >= delay) {
        // 즉시 실행
        callback(...args);
        lastRunRef.current = now;
        cleanup();
      } else {
        // 예약된 실행
        lastArgsRef.current = args;

        if (!timeoutRef.current) {
          timeoutRef.current = setTimeout(() => {
            if (lastArgsRef.current) {
              callback(...lastArgsRef.current);
              lastRunRef.current = Date.now();
              lastArgsRef.current = null;
            }
            timeoutRef.current = null;
          }, delay - timeSinceLastRun);
        }
      }
    },
    [callback, delay, cleanup]
  );
  useEffect(() => cleanup, [cleanup]);

  return throttled;
};
export default useThrottle;
