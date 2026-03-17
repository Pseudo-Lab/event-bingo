// import { useState } from "react";
import "./App.css";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import Home from "./modules/Home/Home.tsx";
import Footer from "./modules/Footer/Footer.tsx";
import BingoGame from "./modules/Bingo/BingoGame.tsx";
import { CssBaseline } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const defaultTheme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#63cfb3",
    },
  },
  typography: {
    fontFamily:
      '"Spoqa Han Sans Neo", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
  },
});

function AppLayout() {
  const location = useLocation();
  const showFooter = !["/", "/bingo"].includes(location.pathname);

  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/bingo" element={<BingoGame />} />
        </Routes>
      </main>
      {showFooter ? <Footer /> : null}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider theme={defaultTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
