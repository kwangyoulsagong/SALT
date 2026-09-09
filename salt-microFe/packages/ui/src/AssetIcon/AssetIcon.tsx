import { vars } from "../styles/tokens.css";
import { assetIconStyles, imageStyles } from "./styles/assetIcon.css";

export type AssetIconSize = "sm" | "md" | "lg" | "xl";

export interface AssetIconProps {
  /** 종목 코드나 티커. 로고가 없을 때 이니셜과 배경색의 근거가 된다. */
  symbol: string;
  /** 로고 이미지 URL. 없으면 이니셜 폴백으로 렌더한다. */
  src?: string;
  size?: AssetIconSize;
  /** 스크린 리더가 읽을 이름. 없으면 `symbol`을 읽는다. */
  name?: string;
  className?: string;
}

/** 흰 글자 대비 4.5:1 이상인 값만 넣는다. */
const FALLBACK_PALETTE = [
  vars.colors.brand.primary,
  vars.colors.neutral[600],
  vars.colors.neutral[700],
  vars.colors.status.infoDark,
  vars.colors.status.successDark,
  vars.colors.status.errorDark,
];

/** 같은 심볼이면 항상 같은 색이 나오게 하는 결정적 해시. */
const pickColor = (symbol: string) => {
  let hash = 0;
  for (let i = 0; i < symbol.length; i += 1) {
    hash = (hash * 31 + symbol.charCodeAt(i)) % 100000;
  }
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
};

/** 한글은 1글자, 그 외는 2글자를 쓴다. */
const toInitials = (symbol: string) => {
  const trimmed = symbol.trim();
  if (!trimmed) return "?";
  return /[가-힣]/.test(trimmed[0] as string)
    ? trimmed.slice(0, 1)
    : trimmed.slice(0, 2).toUpperCase();
};

export const AssetIcon = ({
  symbol,
  src,
  size = "md",
  name,
  className,
}: AssetIconProps) => {
  const label = name || symbol;
  const rootClassName = `${assetIconStyles({ size })} ${className || ""}`;

  if (src) {
    return (
      <span className={rootClassName}>
        <img className={imageStyles} src={src} alt={label} loading="lazy" />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      className={rootClassName}
      style={{ background: pickColor(symbol) }}
    >
      {toInitials(symbol)}
    </span>
  );
};
