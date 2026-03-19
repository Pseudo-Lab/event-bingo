import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./modules/Home/Home.tsx";
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

function AppRoutes() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/bingo" element={<BingoGame />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider theme={defaultTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
