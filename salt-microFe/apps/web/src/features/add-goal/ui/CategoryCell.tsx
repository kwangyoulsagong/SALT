import { ReactNode } from "react";

import { Flex } from "./CategoryCell.css";

export const CategoryCell = ({ children }: { children: ReactNode }) => {
  return <section className={Flex}>{children}</section>;
};

export default CategoryCell;
