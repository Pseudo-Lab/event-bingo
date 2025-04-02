import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { getUser, updateBingoBoard } from "../../api/bingo_api";

const BingoQR = () => {
  const { id } = useParams();

  useEffect(() => {
    // API 호출
    const fetchData = async () => {
      const origin_id = atob(id);
      const myId = localStorage.getItem("myID");
      if (myId === null || myId === "") window.location.href = "/";

      const user = await getUser(myId);
      if (user === null || user.ok === false) {
        localStorage.setItem("myID", "");
        window.location.href = "/";
      }

      const result = await updateBingoBoard(origin_id, user.user_id);
      if (result === true) window.location.href = "/bingo";
    };

    fetchData();
  }, []); // 빈 배열: 컴포넌트 마운트 시 한 번 실행

  return <div>QR 체크중</div>;
};

export default BingoQR;
