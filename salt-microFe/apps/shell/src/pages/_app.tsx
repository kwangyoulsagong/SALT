"use client";
import { Suspense, lazy } from "react";

const Goals = lazy(() => import("goals/App"));

function App() {
  return (
    <div style={{ backgroundColor: "red", padding: "20px" }}>
      여기는 쉘입니다.
      <Suspense fallback={<div>is loading</div>}>
        <Goals />
      </Suspense>
    </div>
  );
}

export default App;
