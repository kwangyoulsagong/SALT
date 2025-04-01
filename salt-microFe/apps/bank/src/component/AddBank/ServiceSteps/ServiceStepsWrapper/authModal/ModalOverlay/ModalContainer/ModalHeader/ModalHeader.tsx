import { ReactNode } from "react";
import { modalHeader } from "./ModalHeader.css";

const ModalHeader = ({ children }: { children: ReactNode }) => {
  return <header className={modalHeader}>{children}</header>;
};
export default ModalHeader;
