import { ReactNode } from "react";
import { modalOverlay } from "./ModalOverlay.css";

const ModalOverlay = ({ children }: { children: ReactNode }) => {
  return <section className={modalOverlay}>{children}</section>;
};
export default ModalOverlay;
