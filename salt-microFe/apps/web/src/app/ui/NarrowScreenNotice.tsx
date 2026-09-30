import Image from "next/image";

import { SITE_NAME } from "@/shared/config";
import { NARROW_SCREEN_MESSAGES as M } from "@/shared/i18n";

import { CopyPcLinkButton } from "./CopyPcLinkButton";
import {
  brand,
  browser,
  browserBar,
  card,
  cardBody,
  cardTitle,
  dot,
  footer,
  heading,
  line,
  monitor,
  neck,
  notice,
  prompt,
  screen,
  stand,
  bezel,
} from "./NarrowScreenNotice.css";

/** 스크린샷은 PC 1440 × 900 화면이다(`public/narrow-screen/`). 고정 데이터로 찍었다 — 실제 시세가 아니다 */
const SHOT = { width: 1440, height: 900 } as const;

/**
 * 좁은 화면 안내 한 장(`FE-REQ-043`). **서버 컴포넌트**이고 CSS 로만 보인다(`NarrowScreenNotice.css.ts` `NARROW_MAX`).
 *
 * 앱 껍데기(`AppShell`)의 일부라 `app` 레이어에 둔다 — 라우트마다 다른 화면이 아니라, 폭이 모자랄 때 모든 라우트를
 * 대신하는 프레임이다. 넓은 화면에서는 `display: none` 이라 스크린리더 · 탭 순서에도 없다.
 */
export const NarrowScreenNotice = () => (
  // 본문의 <main> 이 숨겨지므로 이것이 main 랜드마크다(axe landmark-one-main)
  <main className={notice} aria-labelledby="narrow-screen-heading">
    <p className={brand}>{SITE_NAME}</p>
    <h1 id="narrow-screen-heading" className={heading}>
      {M.heading.map((text) => (
        <span key={text} className={line}>
          {text}
        </span>
      ))}
    </h1>

    <div className={monitor}>
      <div className={bezel}>
        <Image
          className={screen}
          src="/narrow-screen/investments.webp"
          alt={M.screenAlt}
          width={SHOT.width}
          height={SHOT.height}
          sizes="260px"
        />
      </div>
      <div className={neck} aria-hidden="true" />
      <div className={stand} aria-hidden="true" />
    </div>

    <div className={card}>
      <h2 className={cardTitle}>
        {M.cardTitle.map((text) => (
          <span key={text} className={line}>
            {text}
          </span>
        ))}
      </h2>
      <p className={cardBody}>{M.cardBody}</p>
      <div className={browser}>
        <div className={browserBar} aria-hidden="true">
          <span className={dot} />
          <span className={dot} />
          <span className={dot} />
        </div>
        <Image
          className={screen}
          src="/narrow-screen/detail.webp"
          alt={M.cardAlt}
          width={SHOT.width}
          height={SHOT.height}
          sizes="360px"
        />
      </div>
    </div>

    <div className={footer}>
      <p className={prompt}>{M.prompt}</p>
      <CopyPcLinkButton />
    </div>
  </main>
);

export default NarrowScreenNotice;
