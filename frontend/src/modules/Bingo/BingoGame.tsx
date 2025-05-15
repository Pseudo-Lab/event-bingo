import React, { useState, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import {
  getBingoBoard,
  updateBingoBoard,
  createBingoBoard,
  getUserInteractionCount,
  createUserBingoInteraction,
  getUserAllInteraction,
  getUserLatestInteraction,
  getUserName,
  submitReview,
} from '../../api/bingo_api';
import bingoKeywords from '../../data/bingo-keywords.json';
import { bingoConfig } from '../../config/bingoConfig';

import GradientContainer from '../../styles/GradientContainer';
import BingoHeader from './components/BingoHeader';
import InitialSetupDialog from './components/InitialSetupDialog';
import KeywordExchangeInput from './components/KeywordExchangeInput';
import BingoBoard from './components/BingoBoard';
import ExchangeHistory from './components/ExchangeHistory';
import ReviewModal from './components/ReviewModal';
import AllBingoModal from './components/AllBingoModal';
import ConfettiEffect from './components/ConfettiEffect';
import CountdownScreen from './components/CountdownScreen';
import { BingoCell, CompletedLine, ExchangeRecord } from './components/types';

const BingoGame = () => {
  const [username, setUsername] = useState('사용자 이름');
  const [userId, setUserId] = useState('');
  const [bingoBoard, setBingoBoard] = useState<BingoCell[]>([]);
  const [opponentId, setOpponentId] = useState('');
  const [completedLines, setCompletedLines] = useState<CompletedLine[]>([]);
  const [bingoCount, setBingoCount] = useState(0);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'warning' | 'error' | 'info'>('success');
  const [myKeywords, setMyKeywords] = useState<string[]>([]);
  const [exchangeHistory, setExchangeHistory] = useState<ExchangeRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [initialSetupOpen, setInitialSetupOpen] = useState(false);
  const [selectedInitialKeywords, setSelectedInitialKeywords] = useState<string[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStars, setReviewStars] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [hideReviewModal, setHideReviewModal] = useState(() => localStorage.getItem("hideReviewModal") === "true");
  const [showAllBingoModal, setShowAllBingoModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [locked, setLocked] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isTester = urlParams.get("early") === "true";
    return !isTester && new Date().getTime() < bingoConfig.unlockTime;
  });

  const keywordCount = bingoConfig.keywordCount;

  useEffect(() => {
    const init = async () => {
      const storedId = localStorage.getItem("myID");
      const storedName = localStorage.getItem("myUserName");
      if (!storedId) return window.location.href = '/';
      setUserId(storedId);
      setUsername(storedName || '');
      const board = await getBingoBoard(storedId);
      if (board.length === 0) setInitialSetupOpen(true);
      else setBingoBoard(board);
    };
    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = bingoConfig.unlockTime - now;
      if (diff <= 0) {
        setLocked(false);
        clearInterval(interval);
      } else {
        setRemainingTime(diff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const showAlert = (msg: string, severity: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setAlertMessage(msg);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };

  const handleInitialSetup = async () => {
    if (selectedInitialKeywords.length !== keywordCount) return;
    const shuffled = [...bingoKeywords.keywords].sort(() => Math.random() - 0.5);
    const board: BingoCell[] = shuffled.slice(0, 25).map((val, i) => ({
      id: i, value: val, selected: selectedInitialKeywords.includes(val) ? 1 : 0, status: 0
    }));
    await createBingoBoard(userId, Object.fromEntries(board.map(cell => [cell.id, cell])));
    setBingoBoard(board);
    setMyKeywords(selectedInitialKeywords);
    setInitialSetupOpen(false);
    showAlert('키워드가 설정되었습니다!');
  };

  const handleExchange = async () => {
    if (!opponentId || userId === opponentId) {
      showAlert("잘못된 ID입니다.", 'warning');
      return;
    }
    const name = await getUserName(opponentId);
    if (!name) return showAlert("존재하지 않는 ID입니다.", 'error');
    await updateBingoBoard(userId, opponentId);
    await Promise.all(myKeywords.map(k => createUserBingoInteraction(k, parseInt(userId), parseInt(opponentId))));
    showAlert(`"${name}"님에게 키워드를 전송했습니다!`);
  };

  const getCellStyle = (index: number) => ({ p: 1, border: '1px solid grey' });
  const isCellInCompletedLine = (index: number) => false; // dummy

  if (locked) return <CountdownScreen remainingTime={remainingTime} />;

  return (
    <GradientContainer>
      <BingoHeader username={username} userId={userId} userProfileUrl={bingoConfig.conferenceInfoPage} />

      <InitialSetupDialog
        open={initialSetupOpen}
        keywordCount={keywordCount}
        cellValues={bingoKeywords.keywords}
        selectedKeywords={selectedInitialKeywords}
        onClose={() => setInitialSetupOpen(false)}
        onConfirm={handleInitialSetup}
        onToggleKeyword={(k) => {
          setSelectedInitialKeywords(prev =>
            prev.includes(k) ? prev.filter(x => x !== k) : prev.length < keywordCount ? [...prev, k] : prev
          );
        }}
      />

      <KeywordExchangeInput
        userId={userId}
        opponentId={opponentId}
        onOpponentChange={setOpponentId}
        onExchange={handleExchange}
      />

      <BingoBoard
        board={bingoBoard}
        getCellStyle={getCellStyle}
        isCellInCompletedLine={isCellInCompletedLine}
      />

      <ExchangeHistory
        visible={showHistory}
        onToggle={() => setShowHistory(!showHistory)}
        history={exchangeHistory}
      />

      <ReviewModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        stars={reviewStars}
        text={reviewText}
        onChangeStars={setReviewStars}
        onChangeText={setReviewText}
        onSubmit={async () => {
          if (userId && reviewStars !== null) {
            await submitReview(userId, reviewStars, reviewText);
            showAlert("리뷰 감사합니다!");
            localStorage.setItem("hideReviewModal", "true");
            setHideReviewModal(true);
          }
        }}
        onDismissForever={() => {
          localStorage.setItem("hideReviewModal", "true");
          setHideReviewModal(true);
        }}
      />

      <AllBingoModal open={showAllBingoModal} onClose={() => setShowAllBingoModal(false)} />
      {showConfetti && <ConfettiEffect />}

      <Snackbar open={alertOpen} autoHideDuration={3000} onClose={() => setAlertOpen(false)}>
        <Alert severity={alertSeverity} variant="filled">{alertMessage}</Alert>
      </Snackbar>
    </GradientContainer>
  );
};

export default BingoGame;
