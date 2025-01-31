import { createTheme, style } from "@vanilla-extract/css";

export const [themeClass, vars] = createTheme({
  color: {
    primary: "#007bff",
    secondary: "#6c757d",
    background: "#212529",
    text: "#212529",
  },
  space: {
    small: "0.5rem",
    medium: "1rem",
    large: "1.5rem",
  },
  font: {
    small: "0.875rem",
    medium: "1rem",
    large: "1.25rem",
  },
});

// 재사용 가능한 스타일
export const container = style({
  padding: vars.space.medium,
  backgroundColor: vars.color.background,
  color: vars.color.text,
  height: "30vh",
});

export const button = style({
  padding: `${vars.space.small} ${vars.space.medium}`,
  backgroundColor: vars.color.primary,
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  fontSize: vars.font.medium,
  cursor: "pointer",
  ":hover": {
    backgroundColor: "#0056b3",
  },
});

export const card = style({
  padding: vars.space.medium,
  backgroundColor: vars.color.background,
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
});
