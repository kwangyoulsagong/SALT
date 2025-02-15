import { style } from "@vanilla-extract/css";
export const modalHeader = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px",
  borderBottom: `1px solid #E5E8EB`,
});
export const closeButton = style({
  width: "2rem",
  height: "2rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  border: "none",
  transition: "background-color 0.2s",
  ":hover": {
    backgroundColor: "#E5E8EB",
  },
});
