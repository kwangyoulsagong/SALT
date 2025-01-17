import { style, styleVariants } from "@vanilla-extract/css";

// 버튼 variants
export const buttonVariants = styleVariants({
  primary: {
    width: "50px",
    height: "30px",
    background: "#7949FF",
    borderRadius: "8px",
    color: "#FFFFFF",
    fontWeight: "bold",
    borderStyle: "none",
    cursor: "pointer",
    transition: "all 0.2s ease", // 부드러운 전환 효과 추가
    ":active": {
      // 클릭했을 때의 스타일
      transform: "translateY(1px)", // 살짝 눌러지는 효과
      background: "#3A11AD",
      boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)", // 내부 그림자로 눌린 느낌
    },
  },
});
