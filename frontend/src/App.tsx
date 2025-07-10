// import { useState } from "react";
import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./modules/Home/Home.tsx";
import Footer from "./modules/Footer/Footer.tsx";
import BingoGame from "./modules/Bingo/BingoGame.tsx";
import { Container, CssBaseline } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";

function App() {
  const defaultTheme = createTheme();

  return (
    <ThemeProvider theme={defaultTheme}>
      <BrowserRouter>
        <CssBaseline />
        <Container className="App">
          <Routes>
            <Route path="/business-experimentation2025" Component={Home} />
            <Route path="/business-experimentation2025/bingo" element={<BingoGame />} />
          </Routes>
          <Footer />
        </Container>
      </BrowserRouter>
    </ThemeProvider>
  );
}

function Test() {
  return <div>준비중입니다</div>;
}

export default App;
