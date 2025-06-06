import { styleVariants } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css.ts";

// 버튼 variants
export const inputVariants = styleVariants({
  primary: {
    width: "50px",
    height: "30px",
    background: "#7949FF",
  },
  goals: {
    width: "90vw",
    height: "40px",
    border: "none",
    outline: "none",
    fontSize: vars.fontSizes.heading1,
    color: "#8B95A1",
    fontWeight: vars.fontWeights.semibold,
    borderBottom: "#F2F4F6 solid 2px",
  },
  bank: {
    padding: "15px",
    width: "80vw",
    height: "40px",
    border: `1px solid #E5E8EB`,
    fontSize: vars.fontSizes.heading2,
    borderRadius: "10px",
  },

  birth: {
    padding: "15px",
    width: "39vw",
    height: "40px",
    border: `1px solid #E5E8EB`,
    fontSize: vars.fontSizes.heading2,
    borderRadius: "10px",
  },
  birthSecrete: {
    padding: "5px",
    width: "10vw",
    height: "40px",
    border: `1px solid #E5E8EB`,
    borderRight: "none",
    borderTopLeftRadius: "10px",
    borderBottomLeftRadius: "10px",
    fontSize: vars.fontSizes.heading2,
  },
});
