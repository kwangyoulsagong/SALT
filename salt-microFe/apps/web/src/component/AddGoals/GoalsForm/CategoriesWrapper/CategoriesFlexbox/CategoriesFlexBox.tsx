import { ReactNode } from "react";
import { Flex } from "./CategoriesFlexBox.css";

const CategoriesFlexBox = ({ children }: { children: ReactNode }) => {
  return <section className={Flex}>{children}</section>;
};
export default CategoriesFlexBox;
