import { style, styleVariants } from "@vanilla-extract/css";

// 기본 버튼 스타일
const baseButton = style({
  padding: "0.5rem 1rem",
  borderRadius: "0.5rem",
  border: "none",
  cursor: "pointer",
  fontSize: "1rem",
  transition: "all 0.2s ease",
  ":hover": {
    transform: "translateY(-1px)",
  },
});

// 버튼 variants
export const buttonVariants = styleVariants({
  primary: [
    baseButton,
    {
      backgroundColor: "#0091FF",
      color: "white",
      ":hover": {
        backgroundColor: "#007CD9",
      },
    },
  ],
  secondary: [
    baseButton,
    {
      backgroundColor: "#15C39A",
      color: "white",
      ":hover": {
        backgroundColor: "#12A382",
      },
    },
  ],
  outline: [
    baseButton,
    {
      backgroundColor: "transparent",
      border: "2px solid #0091FF",
      color: "#0091FF",
      ":hover": {
        backgroundColor: "#0091FF",
        color: "white",
      },
    },
  ],
});
