import type { HomeCardBars, HomeCardPreview, HomeCardProgress, HomeDomain } from "@repo/core/home";
import { ProgressBar } from "@repo/ui/progressBar";
import { Sparkline } from "@repo/ui/sparkline";

import * as s from "./MobileCardPreview.css";

/** 막대 높이 최소(%) — 0원인 날도 바닥이 보이게(그리기 전용, 숫자를 새로 쓰지 않는다) */
const BAR_MIN_PERCENT = 4;

/**
 * 휴대폰 홈 카드 미리보기(`FE-REQ-072` — 사용자 "홈에 차트하고 같은거 안보이네 모바일은") — 데스크톱 홈 카드(`entities/home` `HomeCardPreviewView`)와
 * **같은 BFF 미리보기 값**(흐름선 · 날마다 막대 · 목표 진척)을 휴대폰 폭으로. 값은 서버 숫자 그대로, 화면은 높이 · 선 모양만. 그림 아래 한 줄 글(`caption`)
 */
export const MobileCardPreview = ({ domain, preview }: { domain: HomeDomain; preview: HomeCardPreview }) => (
  <div className={`${s.box} ${s.accent[domain]}`}>
    {preview.kind === "trend" ? (
      <Sparkline points={preview.points} label={preview.label} area width={320} height={56} strokeWidth={2} className={s.trend} />
    ) : preview.kind === "bars" ? (
      <Bars preview={preview} />
    ) : (
      <Progress preview={preview} />
    )}
    {preview.kind !== "progress" && preview.caption ? <p className={s.caption}>{preview.caption}</p> : null}
  </div>
);

const Bars = ({ preview }: { preview: HomeCardBars }) => {
  const peak = Math.max(0, ...preview.values.map((value) => value ?? 0));
  const lastIndex = preview.values.reduce<number>((last, value, index) => (value === null ? last : index), -1);
  return (
    <div role="img" aria-label={preview.label} className={s.bars}>
      {preview.values.map((value, index) => (
        <span
          key={index}
          aria-hidden
          className={value === null ? s.barFuture : index === lastIndex ? s.barLast : s.bar}
          style={value === null ? undefined : { height: `${Math.max(BAR_MIN_PERCENT, peak === 0 ? 0 : (value / peak) * 100)}%` }}
        />
      ))}
    </div>
  );
};

const Progress = ({ preview }: { preview: HomeCardProgress }) => (
  <ul className={s.progressList} aria-label={preview.label}>
    {preview.items.map((item) => (
      <li key={item.label} className={s.progressRow}>
        <span className={s.progressName}>{item.label}</span>
        <ProgressBar value={item.ratio} label={`${item.label} ${item.value}`} height={6} className={s.progressTrack} />
        <span className={s.progressValue}>{item.value}</span>
      </li>
    ))}
  </ul>
);
