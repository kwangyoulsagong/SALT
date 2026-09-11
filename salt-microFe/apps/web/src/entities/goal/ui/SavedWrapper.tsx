import { ReactNode } from "react";

import { SavedWrapper as SavedWrapperStyle } from "./SavedWrapper.css";

export const SavedWrapper = ({ children }: { children: ReactNode }) => {
  return <div className={SavedWrapperStyle}>{children}</div>;
};

export default SavedWrapper;
