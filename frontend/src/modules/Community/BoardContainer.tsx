
import { Routes, Route } from "react-router-dom";
import BoardListView from "./BoardListView";
import BoardView from "./BoardView";
import BoardEditView from "./BoardEditView";


const BoardContainer = () => {
  return (
    <Routes>
      <Route path="/" element={<BoardListView />} />
      <Route path=":id" element={<BoardView />} />
      <Route path="/new" element={<BoardEditView />} />
      <Route path="/edit/:id" element={<BoardEditView />} />
    </Routes>
  );
};

export default BoardContainer;
