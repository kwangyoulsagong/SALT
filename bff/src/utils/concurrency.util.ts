/**
 * 프로세스 안 동시 실행 상한.
 *
 * 줄을 세우지 않고 **바로 거절한다.** `explain` 은 한 번에 최대 20s 를 잡는 LLM 호출이라
 * 대기열에 넣으면 뒤 요청이 앞 요청 시간만큼 커넥션을 더 잡는다. 화면은 거절을 받고
 * 다시 누르면 된다 — 프론트 디바운스가 1차 방어다(`BFF-REQ-025` Open Question).
 *
 * > 프로세스가 둘이 되면 상한도 프로세스 수만큼 늘어난다. `rateLimit` 과 같은 한계다.
 */
export const createConcurrencyGate = (max: number) => {
  let active = 0;

  return {
    /** 자리가 있으면 `release` 를, 없으면 `null` 을 준다. `release` 는 여러 번 불러도 한 번만 센다 */
    tryAcquire(): (() => void) | null {
      if (active >= max) return null;
      active += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        active -= 1;
      };
    },
    get active() {
      return active;
    },
  };
};
