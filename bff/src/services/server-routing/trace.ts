import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";

/**
 * 추적 ID — **BFF 가 만들고** 서버가 이어받는다(`BFF-REQ-045` FR-7 · `kotlin-platform.md` §6). W3C `traceparent` 형식이라
 * Kotlin(Micrometer · OpenTelemetry)이 그대로 부모로 읽는다. 들어온 요청에 이미 있으면(Next 서버 등) 그 추적을 잇고 span 만 새로.
 *
 * span 내보내기(OpenTelemetry SDK · 수집처)는 수집처가 정해질 때(`OPS-001`) — 지금은 ID 전달만.
 */
const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
const storage = new AsyncLocalStorage<{ traceId: string }>();

const hex = (bytes: number) => randomBytes(bytes).toString("hex");

export const traceIdFrom = (incoming: string | undefined): string => {
  const match = incoming ? TRACEPARENT.exec(incoming.trim()) : null;
  const id = match?.[1];
  return id && !/^0+$/.test(id) ? id : hex(16);
};

/** 요청 하나를 한 추적 안에서 돌린다 — Express 미들웨어에서 부른다. */
export const runInTrace = <T>(incoming: string | undefined, fn: () => T): T => storage.run({ traceId: traceIdFrom(incoming) }, fn);

/** 서버로 보낼 `traceparent`. 요청 밖(워커 · WS)이면 새 추적. */
export const outgoingTraceparent = (): string => `00-${storage.getStore()?.traceId ?? hex(16)}-${hex(8)}-01`;

export const currentTraceId = (): string | undefined => storage.getStore()?.traceId;
