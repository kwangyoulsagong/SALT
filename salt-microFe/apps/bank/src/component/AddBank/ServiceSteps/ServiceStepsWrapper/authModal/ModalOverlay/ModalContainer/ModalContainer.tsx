import { ReactNode } from "react";
import { modalContainer } from "./ModalContainer.css";

const ModalContainer = ({ children }: { children: ReactNode }) => {
  return <section className={modalContainer}>{children}</section>;
};
export default ModalContainer;
