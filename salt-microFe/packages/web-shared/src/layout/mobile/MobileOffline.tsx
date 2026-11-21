"use client";

import { useEffect, useState, type ReactNode } from "react";

import { offlineStampText, type OfflineRecord, type OfflineScreen, type OfflineSnapshot } from "@repo/core/mobile";

import { readOfflineSnapshot, saveOfflineSnapshot, useOnline } from "../../lib";

import { MOBILE_MESSAGES as M } from "./messages";
import { MobileSection } from "./MobileScreen";
import * as s from "./MobileOffline.css";

/**
 * 받은 화면 한 벌을 이 기기에 둔다(`FE-REQ-073` FR-1) — 그리는 것 0. 값이 바뀔 때마다(다시 받기 · 쓰기 뒤) 덮어쓴다.
 * 받은 시각은 효과 안에서 찍는다(렌더 중 지금 시각 0) — 서버 컴포넌트가 준 값이면 그 화면이 그려진 때
 */
export const MobileOfflineSave = ({ snapshot }: { snapshot: OfflineSnapshot | null }) => {
  // 같은 값이면 다시 쓰지 않는다 — 객체가 새로 만들어져도 글자가 같으면 한 번
  const key = snapshot ? JSON.stringify(snapshot) : null;
  useEffect(() => {
    if (!key) return;
    void saveOfflineSnapshot(JSON.parse(key) as OfflineSnapshot, Date.now());
  }, [key]);
  return null;
};

/** 한 벌 그리기 — 띠(오프라인 · HH:MM 기준) + 구역 카드. 값은 저장한 글자 그대로 */
export const MobileOfflineView = ({ record, online }: { record: OfflineRecord; online: boolean }) => {
  const [stamp, setStamp] = useState<string | null>(null);
  useEffect(() => {
    setStamp(offlineStampText(record.fetchedAt, Date.now()));
  }, [record.fetchedAt]);
  return (
    <div className={s.view} data-offline-snapshot={record.screen}>
      <p className={s.band} role="status">
        {stamp ? (online ? M.failedStamp(stamp) : M.offlineStamp(stamp)) : M.snapshotNote}
      </p>
      {record.snapshot.sections.map((section, index) => (
        <MobileSection key={`${index}-${section.title}`} title={section.title}>
          <ul className={s.rows}>
            {section.rows.map((row, rowIndex) => (
              <li key={`${rowIndex}-${row.label}`} className={s.row}>
                <span className={s.rowMain}>
                  <span className={s.rowLabel}>{row.label}</span>
                  {row.sub ? <span className={s.rowSub}>{row.sub}</span> : null}
                </span>
                <span className={s.rowValue}>{row.value}</span>
              </li>
            ))}
          </ul>
        </MobileSection>
      ))}
      <p className={s.note}>{M.snapshotNote}</p>
    </div>
  );
};

/**
 * 받기 실패 자리(`FE-REQ-073` FR-2) — 이 기기에 그 사용자의 한 벌이 있으면 그것을, 없으면 원래 실패 화면(`children`).
 * 오프라인 문서 이동은 서비스 워커의 오프라인 한 장이 같은 한 벌을 그린다(`routes.ts`) — 이 잎은 서버 · 브라우저 조회가 실패한 자리
 */
export const MobileOfflineFallback = ({ screen, children }: { screen: OfflineScreen; children: ReactNode }) => {
  const online = useOnline();
  const [record, setRecord] = useState<OfflineRecord | null>(null);
  useEffect(() => {
    let alive = true;
    void readOfflineSnapshot(screen).then((found) => {
      if (alive) setRecord(found);
    });
    return () => {
      alive = false;
    };
  }, [screen]);
  return record ? <MobileOfflineView record={record} online={online} /> : <>{children}</>;
};
