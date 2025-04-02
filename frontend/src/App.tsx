// import { useState } from "react";
import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Header from "./modules/Header/Header.tsx";
import Home from "./modules/Home/Home.tsx";
import IntroduceBuilder from "./modules/Builder/IntroduceBuilder.tsx";
import Bingo from "./modules/Bingo/index.tsx";
import Footer from "./modules/Footer/Footer.tsx";
import SignUpForm from "./modules/Header/SignUpForm.tsx";
import Board from "./modules/Community/index.tsx";
import BoardView from "./modules/Community/BoardView.tsx";
import BingoQR from "./modules/Bingo/BingoQR.tsx";
import { Container, CssBaseline } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";

function App() {
  const defaultTheme = createTheme();

  return (
    <ThemeProvider theme={defaultTheme}>
      <BrowserRouter>
        <CssBaseline />
        <Container className="App">
          <Header />
          <Routes>
            <Route path="/" Component={Home} />
            <Route path="/builder" element={<IntroduceBuilder />} />
            <Route path="/runner" element={<Test />} />
            <Route path="/community/*" element={<Board />} />
            <Route path="/bingo" element={<Bingo />} />
            <Route path="/signup" element={<SignUpForm />} />
            <Route path="/bingo_qr/:id" element={<BingoQR />} />
            {/* <Route path="/posts" component={Posts} />
            <Route path="/posts/:id" component={Post} />
            <Route path="/posts/new" component={NewPost} />
            <Route path="/posts/edit/:id" component={EditPost} />
            <Route path="/posts/delete/:id" component={DeletePost} />
            <Route path="/posts/search/:query" component={Search} />
            <Route path="/posts/search/:query/:page" component={Search} /> */}
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
