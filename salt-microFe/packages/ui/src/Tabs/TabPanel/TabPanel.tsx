import { ReactNode } from "react";
import { tabPanelStyles } from "../style/tabs.css.ts";

export interface TabPanelProps {
  children: ReactNode;
  isActive: boolean;
  id?: string;
  tabId?: string;
}

export const TabPanel = ({ children, isActive, id, tabId }: TabPanelProps) => {
  if (!isActive) return null;

  return (
    <div
      id={id}
      role="tabpanel"
      aria-labelledby={tabId}
      tabIndex={0}
      className={tabPanelStyles}
    >
      {children}
    </div>
  );
};
