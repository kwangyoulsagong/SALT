import { useEffect, useState } from "react";

function App() {
  const [number, setNumber] = useState(0);
  useEffect(() => {
    setNumber(30);
  }, []);
  return (
    <div style={{ backgroundColor: "blue", padding: "20px" }}>
      <button onClick={() => setNumber((prev) => prev + 1)}></button>
      <span>{number}</span>
    </div>
  );
}

export default App;
