import { useEffect, useRef } from "react";
import {
  bars,
  category,
  graphsContainer,
  graphsWrapper,
  Wrapper,
} from "./AnalysisGraph.css";
interface AnalysisGraphProps {
  data: Array<{ id: number; category: string; percent: string }>;
}

const AnalysisGraph = ({ data }: AnalysisGraphProps) => {
  const transitionRefs = useRef<HTMLDivElement[]>([]);
  useEffect(() => {
    requestAnimationFrame(() => {
      transitionRefs.current.forEach((el, i) => {
        if (el) {
          setTimeout(() => {
            el.style.transition = "1s ease";
            el.style.height = `${data[i].percent}%`;
          }, 100);
        }
      });
    });
  }, [data]);
  return (
    <section className={Wrapper}>
      {data.map((value, index) => (
        <section key={value.id} className={graphsContainer}>
          <article className={graphsWrapper}>
            <div
              ref={(el) => {
                if (el) {
                  transitionRefs.current[index] = el;
                }
              }}
              className={bars}
            ></div>
          </article>
          <span className={category}>{value.category}</span>
        </section>
      ))}
    </section>
  );
};
export default AnalysisGraph;
