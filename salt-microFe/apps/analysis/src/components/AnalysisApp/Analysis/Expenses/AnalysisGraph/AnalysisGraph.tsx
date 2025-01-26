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
  return (
    <section className={Wrapper}>
      {data.map((value) => (
        <section key={value.id} className={graphsContainer}>
          <article className={graphsWrapper}>
            <div className={bars} style={{ height: `${value.percent}%` }}></div>
          </article>
          <span className={category}>{value.category}</span>
        </section>
      ))}
    </section>
  );
};
export default AnalysisGraph;
