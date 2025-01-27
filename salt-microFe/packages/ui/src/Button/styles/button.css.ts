import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css.ts";
// 버튼 variants
const commonStyles = {
  width: "60px",
  height: "30px",
  borderRadius: vars.radius.base,
  color: vars.colors.text.base,
  fontSize: vars.fontSizes.heading3,
  fontWeight: vars.fontWeights.semibold,
  borderStyle: "none",
  cursor: "pointer",
  transition: "all 0.2s ease", // 부드러운 전환 효과 추가
  ":active": {
    // 클릭했을 때의 스타일
    transform: "translateY(1px)", // 살짝 눌러지는 효과
    background: "#3A11AD",
    boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)", // 내부 그림자로 눌린 느낌
  },
};
export const buttonVariants = styleVariants({
  primary: { ...commonStyles, background: vars.colors.brand.primary },
  game: { ...commonStyles, background: "#F59D71" },
});
