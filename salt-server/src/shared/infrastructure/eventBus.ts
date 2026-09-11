import { logger } from "../config/logger";

/**
 * 인프로세스 이벤트 버스.
 *
 * 컨텍스트 간 **상태 변화 전파**에 쓴다(`server-architecture.md` §4). 단일 프로세스이므로
 * 브로커를 두지 않는다.
 *
 * ## 규칙
 *
 * - 핸들러 하나가 던져도 **다른 핸들러는 돈다.** 전파가 조립을 멈추면 안 된다.
 * - **트랜잭션 안에서 publish 하지 않는다.** 커밋 후에 알린다 — 롤백된 사실을 알리면 거짓이다.
 * - 이벤트는 과거형 이름을 쓴다: `ledger.transaction.recorded`.
 */
export type DomainEventHandler<T> = (payload: T) => void | Promise<void>;

class EventBus {
  private readonly handlers = new Map<string, Set<DomainEventHandler<never>>>();

  on<T>(eventName: string, handler: DomainEventHandler<T>): () => void {
    const set =
      this.handlers.get(eventName) ?? new Set<DomainEventHandler<never>>();
    set.add(handler as DomainEventHandler<never>);
    this.handlers.set(eventName, set);
    return () => set.delete(handler as DomainEventHandler<never>);
  }

  async publish<T>(eventName: string, payload: T): Promise<void> {
    const set = this.handlers.get(eventName);
    if (!set || set.size === 0) return;

    await Promise.all(
      [...set].map(async (handler) => {
        try {
          await (handler as DomainEventHandler<T>)(payload);
        } catch (error) {
          logger.error(`이벤트 핸들러 실패: ${eventName}`, error);
        }
      })
    );
  }
}

export const eventBus = new EventBus();
