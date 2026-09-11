import { ReactNode } from "react";

import { Wrapper } from "./SaveInformation.css";

export const SaveInformation = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};

export default SaveInformation;
