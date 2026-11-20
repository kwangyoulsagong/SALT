import { ProgressBar } from "@repo/ui/progressBar";
import { Sparkline } from "@repo/ui/sparkline";

import { HOME_CARD_MESSAGES } from "../model/messages";
import type { HomeCardBars, HomeCardPreview, HomeCardProgress, HomeDomain } from "../model/types";
import {
  bar,
  barFuture,
  barLast,
  bars,
  barsFrame,
  caption,
  domainAccent,
  ghost,
  ghostBadge,
  ghostName,
  ghostTrend,
  previewBox,
  progressList,
  progressName,
  progressRow,
  progressTrack,
  progressValue,
  trend,
} from "./HomeCardPreviewView.css";

/** 막대 칸 높이 범위(%) — 0원인 날도 바닥 선이 보이게 최소를 둔다(그리기 전용, 숫자를 새로 쓰지 않는다) */
const BAR_MIN_PERCENT = 4;

interface HomeCardPreviewViewProps {
  domain: HomeDomain;
  preview: HomeCardPreview;
}

/**
 * 카드 미리보기 — **표시 전용**(`FE-REQ-048` FR-12). 값은 BFF 가 준 서버 숫자 그대로이고, 화면은 칸 높이 · 선 모양으로만 늘이고 줄인다.
 * 그림은 이름(`label`)을 갖고, 그림만 보고 끝나는 사람이 없게 아래 한 줄(`caption`)도 글로 둔다. 색은 도메인 색(막대 · 진척)
 */
export const HomeCardPreviewView = ({ domain, preview }: HomeCardPreviewViewProps) => (
  <div className={`${previewBox} ${domainAccent[domain]}`}>
    {preview.kind === "trend" ? (
      <>
        <Sparkline points={preview.points} label={preview.label} area width={480} height={72} strokeWidth={2} className={trend} />
        {preview.caption ? <p className={caption}>{preview.caption}</p> : null}
      </>
    ) : preview.kind === "bars" ? (
      <BarsPreview preview={preview} />
    ) : (
      <ProgressPreview preview={preview} />
    )}
  </div>
);

const BarsPreview = ({ preview }: { preview: HomeCardBars }) => {
  const peak = Math.max(0, ...preview.values.map((value) => value ?? 0));
  // 오늘 = 마지막으로 지나온 칸 — 한 칸만 진하게(나머지는 옅게)
  const lastIndex = preview.values.reduce<number>((last, value, index) => (value === null ? last : index), -1);
  return (
    <>
      <div role="img" aria-label={preview.label} className={barsFrame}>
        <div className={bars} aria-hidden="true">
          {preview.values.map((value, index) => (
            <span
              key={index}
              className={value === null ? barFuture : index === lastIndex ? barLast : bar}
              style={value === null ? undefined : { height: `${Math.max(BAR_MIN_PERCENT, peak === 0 ? 0 : (value / peak) * 100)}%` }}
            />
          ))}
        </div>
      </div>
      {preview.caption ? <p className={caption}>{preview.caption}</p> : null}
    </>
  );
};

const ProgressPreview = ({ preview }: { preview: HomeCardProgress }) => (
  <ul className={progressList} aria-label={preview.label}>
    {preview.items.map((item) => (
      <li key={item.label} className={progressRow}>
        <span className={progressName}>{item.label}</span>
        <ProgressBar value={item.ratio} label={`${item.label} ${item.value}`} height={6} className={progressTrack} />
        <span className={progressValue}>{item.value}</span>
      </li>
    ))}
  </ul>
);

/**
 * 예시 모양 — 비어 있는 카드가 "여기 무엇이 생기는지"를 보이게(리서치: 빈 영역은 무엇이 생기는지 · 어떻게 채우는지 · 바로 가는 행동).
 * 숫자 · 이름은 없다(지어내지 않는다) — 모양만 회색으로, "예시" 표지. 장식이라 읽지 않는다(`aria-hidden`) — 뜻은 카드 글이 말한다
 */
const GHOST_BARS = [30, 52, 18, 64, 40, 0, 72, 26, 48, 58, 22, 80, 36, 44];
const GHOST_TREND = [40, 46, 42, 55, 51, 60, 57, 66, 63, 72];
const GHOST_PROGRESS = [0.72, 0.38];

export const HomeCardGhostPreview = ({ domain }: { domain: HomeDomain }) => (
  <div className={`${previewBox} ${ghost}`} aria-hidden="true">
    <span className={ghostBadge}>{HOME_CARD_MESSAGES.sample}</span>
    {domain === "invest" ? (
      <Sparkline points={GHOST_TREND} label="" tone="neutral" area width={480} height={72} strokeWidth={2} className={ghostTrend} />
    ) : domain === "household" ? (
      <div className={barsFrame}>
        <div className={bars}>
          {GHOST_BARS.map((height, index) => (
            <span key={index} className={bar} style={{ height: `${Math.max(BAR_MIN_PERCENT, height)}%`, animation: "none" }} />
          ))}
        </div>
      </div>
    ) : (
      <ul className={progressList}>
        {GHOST_PROGRESS.map((ratio) => (
          <li key={ratio} className={progressRow}>
            <span className={ghostName} />
            <ProgressBar value={ratio} label="" height={6} className={progressTrack} />
            <span />
          </li>
        ))}
      </ul>
    )}
  </div>
);
