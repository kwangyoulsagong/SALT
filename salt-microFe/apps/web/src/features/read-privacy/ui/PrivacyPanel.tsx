"use client";

import { Badge, type BadgeTone } from "@repo/ui/badge";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";

import { useHasSession } from "@repo/web-shared/api";
import { panel, panelHead, panelTitle } from "@repo/web-shared/ui/surface.css";

import { usePrivacy, type PrivacyGrade } from "../api";
import { PRIVACY_MESSAGES as MSG } from "../model";
import { block, blockTitle, description, groupRow, items, placeholder, serviceList, serviceName } from "./PrivacyPanel.css";

/** 항목 사이는 쉼표 — 설명 안에 이미 " · " 가 있다(같은 기호면 어디서 끊기는지 안 보인다, 2026-11-13 실화면) */
const ITEM_SEPARATOR = ", ";

/** 등급 색 — 민감만 눈에 띄게. 빨강(되돌릴 수 없는 일)은 쓰지 않는다 */
const TONE: Record<PrivacyGrade, BadgeTone> = { sensitive: "warning", financial: "brand", record: "neutral", unknown: "neutral" };

/**
 * 저장하는 것 · AI 로 가는 것(`FE-REQ-055` FR-7 · `BFF-REQ-046` FR-10). 로그인 전이면 패널째 없다.
 * AI 칸이 먼저다 — "내 기록이 AI 로 가나"가 사람이 먼저 묻는 것이다. 서비스 순서는 BFF(지워지는 범위와 같은 목록).
 */
export const PrivacyPanel = () => {
  const signedIn = useHasSession();
  const privacy = usePrivacy();

  if (signedIn === false) return null;

  return (
    <section className={panel} aria-labelledby="privacy-heading">
      <div className={panelHead}>
        <h2 id="privacy-heading" className={panelTitle}>
          {MSG.heading}
        </h2>
      </div>
      <p className={description}>{MSG.description}</p>
      {privacy.isError ? (
        <StatusLine kind="error">{MSG.failed}</StatusLine>
      ) : !privacy.data ? (
        <div role="status" aria-busy="true" aria-label={MSG.loading} className={placeholder}>
          <Skeleton height="100%" radius="medium" />
        </div>
      ) : (
        <>
          <div className={block}>
            <h3 className={blockTitle}>{MSG.aiHeading}</h3>
            {privacy.data.ai === null ? (
              <StatusLine kind="error">{MSG.aiUnavailable}</StatusLine>
            ) : (
              <>
                <p className={description}>{privacy.data.ai.personal ? MSG.aiPersonal : MSG.aiNone}</p>
                <ul className={serviceList}>
                  {privacy.data.ai.jobs.map((job) => (
                    <li key={job.about}>
                      <span className={serviceName}>{job.about}</span>
                      <span className={items}>{job.inputs.join(ITEM_SEPARATOR)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className={block}>
            <h3 className={blockTitle}>{MSG.storedHeading}</h3>
            <ul className={serviceList}>
              {privacy.data.services
                .filter((s) => MSG.services[s.service])
                .map((s) => (
                  <li key={s.service}>
                    <span className={serviceName}>{MSG.services[s.service]}</span>
                    {s.unavailable ? (
                      <span className={items}>{MSG.serviceUnavailable}</span>
                    ) : (
                      s.groups.map((g) => (
                        <span key={g.grade} className={groupRow}>
                          <Badge tone={TONE[g.grade]} size="sm">
                            {MSG.grades[g.grade]}
                          </Badge>
                          <span className={items}>{g.items.join(ITEM_SEPARATOR)}</span>
                        </span>
                      ))
                    )}
                  </li>
                ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
};
