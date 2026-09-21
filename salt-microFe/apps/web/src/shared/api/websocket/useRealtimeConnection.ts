"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { ConnectionStatus } from "./types";
import { wsClient } from "./wsClient";

/** 첫 수신 전에는 촘촘히 본다 — 헤더가 "대기 중"에 30초씩 머물지 않게. */
const FIRST_MESSAGE_POLL_MS = 1_000;

/**
 * 실시간 연결 상태 + 마지막 수신 시각.
 *
 * **수신 시각은 구독이 아니라 주기적으로 읽는다.** 시세는 초당 수십 건이라 그때마다
 * 알리면 받는 컴포넌트가 그만큼 다시 그려진다. 표시 단위가 분이므로 `tickMs` 마다
 * 한 번 읽으면 충분하고, 그 리렌더는 이 훅을 쓰는 컴포넌트(헤더)에서 끝난다 —
 * 표 전체가 아니다 (`FE-REQ-011` FR-13).
 */
export const useRealtimeConnection = (tickMs: number) => {
  const status = useSyncExternalStore(
    wsClient.subscribeStatus,
    wsClient.getStatus,
    () => ConnectionStatus.Idle,
  );
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const waitingFirst = lastMessageAt === null;

  useEffect(() => {
    const read = () => setLastMessageAt(wsClient.getLastMessageAt());
    read();
    const id = setInterval(read, waitingFirst ? FIRST_MESSAGE_POLL_MS : tickMs);
    return () => clearInterval(id);
  }, [tickMs, waitingFirst]);

  return { status, lastMessageAt };
};
