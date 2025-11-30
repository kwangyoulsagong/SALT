import { useCallback, useEffect, useRef } from "react";

const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  //예약된 타이머 저장
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      cleanup();
      timeoutRef.current = setTimeout(() => {
        callback(timeoutRef.current);
        timeoutRef.current = null;
      }, delay);
    },
    [callback, delay, cleanup]
  );

  useEffect(() => cleanup, [cleanup]);

  return debounced;
};
export default useDebounce;
