import { ReactNode } from "react";

const BirthWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <section
      style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        gap: "10px",
      }}
    >
      {children}
    </section>
  );
};
export default BirthWrapper;
