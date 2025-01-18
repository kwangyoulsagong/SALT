import { useEffect, useState } from "react";

function App({ nickname }: { nickname: string }) {
  const [number, setNumber] = useState(0);
  useEffect(() => {
    setNumber(30);
  }, []);
  return (
    <div style={{ backgroundColor: "blue", padding: "20px" }}>
      <button onClick={() => setNumber((prev) => prev + 1)}></button>
      <span>{number}</span>
      <h1>{nickname}</h1>
    </div>
  );
}

export default App;
