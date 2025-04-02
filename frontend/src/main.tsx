import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// StrictMode는 개발할 때에만 활성화합니다. 버그를 잘 찾기 위해 두 번씩 그린다고 합니다.
ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode>
  <React.Suspense>
    <App />
  </React.Suspense>
  //</React.StrictMode>
);
