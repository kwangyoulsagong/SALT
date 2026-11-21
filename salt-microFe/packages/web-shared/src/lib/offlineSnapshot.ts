import type { SummaryBandItem } from "@repo/ui/summaryBand";

import {
  OFFLINE_DB,
  isOfflineRecord,
  offlineRecordFor,
  trimOfflineSnapshot,
  type OfflineRecord,
  type OfflineRow,
  type OfflineScreen,
  type OfflineSnapshot,
} from "@repo/core/mobile";

import { USER_KEY } from "../config";

/**
 * 휴대폰 마지막 화면 한 벌 저장소(`FE-REQ-073` FR-1) — IndexedDB `OFFLINE_DB`. **브라우저에서만 부른다**(효과 · 처리기 안).
 *
 * - 키는 화면, 행마다 사용자 id. 다른 사용자 행이 있으면 저장 전에 **저장소를 통째로 비운다**(한 기기에 한 사람 몫만)
 * - 로그아웃 · 세션 죽음은 `clearSession` 이 `clearOfflineSnapshots` 를 부른다 — 그 자리에서 지운다
 * - 실패(프라이빗 모드 · 저장소 거절)는 삼킨다 — 한 벌은 덤이고 화면을 막지 않는다
 */

/** 이 기기의 세션 사용자 id — 로그인이 `USER_KEY` 에 둔 `AccountView.id`. 없으면 null */
export const readSessionUserId = (): string | null => {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const id = (JSON.parse(raw) as { id?: unknown }).id;
    return typeof id === "string" && id !== "" ? id : null;
  } catch {
    return null;
  }
};

const openOnce = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const request = indexedDB.open(OFFLINE_DB.name, OFFLINE_DB.version);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (db.objectStoreNames.contains(OFFLINE_DB.store)) db.deleteObjectStore(OFFLINE_DB.store);
        db.createObjectStore(OFFLINE_DB.store, { keyPath: "screen" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

/** 저장소 없는 같은 판 DB(만들다 끊긴 것)면 지우고 한 번 다시 연다 — 같은 판으로는 `upgradeneeded` 가 다시 오지 않는다 */
const openDb = async (): Promise<IDBDatabase | null> => {
  const db = await openOnce();
  if (!db || db.objectStoreNames.contains(OFFLINE_DB.store)) return db;
  db.close();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(OFFLINE_DB.name);
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  });
  const again = await openOnce();
  if (again && !again.objectStoreNames.contains(OFFLINE_DB.store)) {
    again.close();
    return null;
  }
  return again;
};

const done = (tx: IDBTransaction): Promise<boolean> =>
  new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  });

const getAll = (db: IDBDatabase): Promise<unknown[]> =>
  new Promise((resolve) => {
    const request = db.transaction(OFFLINE_DB.store, "readonly").objectStore(OFFLINE_DB.store).getAll();
    request.onsuccess = () => resolve(request.result as unknown[]);
    request.onerror = () => resolve([]);
  });

/** 받은 화면 한 벌을 둔다 — 지금 사용자가 없으면 두지 않는다. 다른 사용자 행 · 깨진 행이 있으면 먼저 비운다 */
export const saveOfflineSnapshot = async (snapshot: OfflineSnapshot, fetchedAt: number): Promise<boolean> => {
  const userId = readSessionUserId();
  if (!userId) return false;
  const db = await openDb();
  if (!db) return false;
  try {
    const existing = await getAll(db);
    const foreign = existing.some((row) => !isOfflineRecord(row) || row.userId !== userId);
    const tx = db.transaction(OFFLINE_DB.store, "readwrite");
    const store = tx.objectStore(OFFLINE_DB.store);
    if (foreign) store.clear();
    const record: OfflineRecord = { screen: snapshot.screen, userId, fetchedAt, snapshot: trimOfflineSnapshot(snapshot) };
    store.put(record);
    return await done(tx);
  } catch {
    return false;
  } finally {
    db.close();
  }
};

/** 그 화면의 한 벌 — 지금 사용자 것일 때만. 다른 사용자 행이면 없는 것으로(저장 때 비운다) */
export const readOfflineSnapshot = async (screen: OfflineScreen): Promise<OfflineRecord | null> => {
  const userId = readSessionUserId();
  if (!userId) return null;
  const db = await openDb();
  if (!db) return null;
  try {
    const value = await new Promise<unknown>((resolve) => {
      const request = db.transaction(OFFLINE_DB.store, "readonly").objectStore(OFFLINE_DB.store).get(screen);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    return offlineRecordFor(value, userId, screen);
  } catch {
    return null;
  } finally {
    db.close();
  }
};

/**
 * 한 벌을 전부 지운다 — 로그아웃 · 세션 죽음(`clearSession`). 저장소를 통째로 지운다(행 0 · DB 0).
 * 다른 탭이 열어 두었으면 `blocked` — 그 탭이 닫히면 지워진다. 기다리지 않는다(로그아웃을 붙잡지 않는다)
 */
export const clearOfflineSnapshots = (): void => {
  if (typeof indexedDB === "undefined") return;
  try {
    indexedDB.deleteDatabase(OFFLINE_DB.name);
  } catch {
    // 저장소가 없으면 지울 것도 없다
  }
};

const textOf = (node: unknown): string | null => (typeof node === "string" ? node : typeof node === "number" ? String(node) : null);

/** 요약 띠 칸 → 한 벌 행 — 값이 글자인 칸만(그림 · 요소는 담지 않는다). 보조 줄은 글자일 때만 */
export const offlineRowsFromSummary = (items: readonly SummaryBandItem[]): OfflineRow[] =>
  items.flatMap((item) => {
    const value = textOf(item.value);
    if (value === null) return [];
    const sub = textOf(item.hint);
    return [{ label: item.label, value, ...(sub ? { sub } : {}) }];
  });
