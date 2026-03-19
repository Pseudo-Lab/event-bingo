import type { CSSProperties, ReactNode } from "react";
import { Dialog } from "@mui/material";
import type {
  AlertSeverity,
  BingoCell,
  BoardPreviewPreset,
  BoardLineCoordinates,
  CompletedLine,
  ExchangeRecord,
} from "./bingoGameTypes";
import { getLineCoordinates } from "./bingoGameUtils";

type HistoryPanelProps = {
  title: string;
  count: number;
  records: ExchangeRecord[];
  emptyMessage: string;
  participantKey: "sendPerson" | "receivePerson";
};

type BingoAlertToastProps = {
  open: boolean;
  severity: AlertSeverity;
  title: string;
  message: string;
  keywords: string[];
  label: string;
  onClose: () => void;
};

type BingoLoadingScreenProps = {
  brandTitle: string;
};

type BingoCountdownScreenProps = {
  brandTitle: string;
  remainingTime: number;
};

type KeywordSetupScreenProps = {
  brandTitle: string;
  exchangeKeywordCount: number;
  isInitializingBoard: boolean;
  keywords: string[];
  selectedKeywords: string[];
  onToggleKeyword: (keyword: string) => void;
  onSubmit: () => void;
  alertToast: ReactNode;
};

type BingoBoardSectionProps = {
  board: BingoCell[];
  boardSize: number;
  connectionLines: BoardLineCoordinates[];
  completedLines: CompletedLine[];
  newBingoCells: number[];
  latestReceivedKeywords: string[];
  animatedCells: number[];
  completedCellIndexes: number[];
  previewTools?: {
    options: Array<{ id: BoardPreviewPreset; label: string }>;
    activePreset: BoardPreviewPreset | null;
    onSelectPreview: (preset: BoardPreviewPreset) => void;
    onResetPreview: () => void;
  };
};

type BingoCelebrationDialogProps = {
  open: boolean;
  bingoMissionCount: number;
  bingoCount: number;
  markedKeywordCount: number;
  metPersonNum: number;
  onClose: () => void;
};

export function NetworkingIllustration() {
  return (
    <svg
      className="bingo-hero__illustration"
      viewBox="0 0 250 190"
      aria-hidden="true"
    >
      <rect x="84" y="114" width="82" height="14" rx="7" fill="#11785f" opacity="0.2" />
      <path
        d="M156 73c19 0 35 15 35 35v43h-34c-23 0-42-19-42-42 0-20 16-36 36-36h5Z"
        fill="#9EF35D"
        stroke="#1B6A51"
        strokeWidth="2.2"
      />
      <path
        d="M115 95c1-18 16-32 34-32 17 0 31 12 34 28"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M97 104c0-18 14-32 32-32 14 0 26 8 31 20"
        fill="#F9F0E9"
        stroke="#1B6A51"
        strokeWidth="2.2"
      />
      <circle cx="113" cy="70" r="18" fill="#F9F0E9" stroke="#1B6A51" strokeWidth="2.2" />
      <path
        d="M102 62c2-11 12-18 23-16 9 2 15 9 15 18"
        fill="none"
        stroke="#7FDB44"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M131 67c5-6 13-6 18-3 5 4 7 12 3 17"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M104 77c5 6 13 10 21 10 10 0 19-4 25-11"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M153 58c6-14 18-20 31-16 9 3 15 12 15 22"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M198 44v18M189 49l18 8M189 58l17-10"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M84 93 70 88c-9-3-14-12-11-21 3-9 13-13 22-10l16 6"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M95 90c-6 11-17 18-30 18-18 0-32-14-32-32s14-32 32-32c10 0 19 4 25 12"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M73 87c11 0 19-8 19-19 0-8-4-14-10-17"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <rect x="77" y="102" width="8" height="40" rx="4" fill="#F9F0E9" stroke="#1B6A51" strokeWidth="2.2" />
      <path
        d="M80 141h37M158 151h28"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M96 102c13 4 22 16 24 30"
        fill="none"
        stroke="#1B6A51"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HistoryPanel({
  title,
  count,
  records,
  emptyMessage,
  participantKey,
}: HistoryPanelProps) {
  return (
    <section className="history-panel">
      <header className="history-panel__header">
        <h2>{title}</h2>
        <span>{count}</span>
      </header>

      {records.length === 0 ? (
        <p className="history-panel__empty">{emptyMessage}</p>
      ) : (
        <div className="history-panel__list">
          {records.map((record, index) => (
            <article key={record.id} className="history-item">
              <div className="history-item__title">
                <span className="history-item__index">{index + 1}</span>
                <strong>{record[participantKey] ?? "참가자"}</strong>
              </div>
              <div className="history-item__chips">
                {record.given.map((word, wordIndex) => (
                  <span key={`${record.id}-${word}-${wordIndex}`} className="history-item__chip">
                    {word}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function BingoAlertToast({
  open,
  severity,
  title,
  message,
  keywords,
  label,
  onClose,
}: BingoAlertToastProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="bingo-toast" role="status" aria-live="polite">
      <article className={`bingo-toast__card is-${severity}`}>
        <div className="bingo-toast__head">
          <span className="bingo-toast__badge">{label}</span>
          <button
            type="button"
            className="bingo-toast__close"
            onClick={onClose}
            aria-label="알림 닫기"
          >
            닫기
          </button>
        </div>
        <strong className="bingo-toast__title">{title}</strong>
        <p className="bingo-toast__message">{message}</p>
        {keywords.length > 0 ? (
          <div className="bingo-toast__keywords">
            {keywords.map((keyword) => (
              <span key={keyword} className="bingo-toast__keyword">
                {keyword}
              </span>
            ))}
          </div>
        ) : null}
      </article>
    </div>
  );
}

export function BingoLoadingScreen({ brandTitle }: BingoLoadingScreenProps) {
  return (
    <div className="bingo-game-page">
      <div className="bingo-game-page__mesh" aria-hidden="true" />
      <div className="bingo-loading-screen">
        <section className="bingo-loading-card" aria-label="bingo loading">
          <p className="bingo-loading-card__label">{brandTitle}</p>
          <h1>빙고 보드를 준비하고 있어요</h1>
          <p>저장된 보드와 교환 기록을 불러오는 중입니다.</p>
        </section>
      </div>
    </div>
  );
}

export function BingoCountdownScreen({
  brandTitle,
  remainingTime,
}: BingoCountdownScreenProps) {
  const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingTime / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remainingTime / (1000 * 60)) % 60);
  const seconds = Math.floor((remainingTime / 1000) % 60);

  return (
    <div className="bingo-countdown">
      <div className="bingo-countdown__content">
        <p className="bingo-countdown__brand">{brandTitle}</p>
        <h1>빙고 오픈까지 조금만 기다려 주세요</h1>
        <div className="bingo-countdown__timer">
          {[
            { label: "일", value: days },
            { label: "시간", value: hours },
            { label: "분", value: minutes },
            { label: "초", value: seconds },
          ].map(({ label, value }) => (
            <div key={label} className="bingo-countdown__unit">
              <strong>{String(value).padStart(2, "0")}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function KeywordSetupScreen({
  brandTitle,
  exchangeKeywordCount,
  isInitializingBoard,
  keywords,
  selectedKeywords,
  onToggleKeyword,
  onSubmit,
  alertToast,
}: KeywordSetupScreenProps) {
  return (
    <div className="keyword-setup-page">
      <div className="keyword-setup-page__mesh" aria-hidden="true" />
      <main className="keyword-setup-shell">
        <p className="keyword-setup-brand">{brandTitle}</p>

        <header className="keyword-setup-header">
          <div className="keyword-setup-header__title">
            <span className="keyword-setup-header__spark keyword-setup-header__spark--left" />
            <h1>관심사 선택</h1>
            <span className="keyword-setup-header__spark keyword-setup-header__spark--right" />
          </div>
          <p>당신의 관심사를 잘 표현할 수 있는 키워드를 {exchangeKeywordCount}개 선택하세요.</p>
        </header>

        <section className="keyword-setup-card" aria-label="interest keyword selection">
          <div className="keyword-setup-card__scroller">
            <div className="keyword-setup-grid">
              {keywords.map((keyword) => {
                const isSelected = selectedKeywords.includes(keyword);

                return (
                  <button
                    key={keyword}
                    type="button"
                    className={`keyword-chip ${isSelected ? "is-selected" : ""}`}
                    onClick={() => onToggleKeyword(keyword)}
                    aria-pressed={isSelected}
                  >
                    {keyword}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="keyword-setup-card__footer">
            <button
              type="button"
              className="keyword-setup-submit"
              onClick={onSubmit}
              disabled={
                selectedKeywords.length !== exchangeKeywordCount || isInitializingBoard
              }
            >
              {isInitializingBoard ? "준비 중..." : "빙고 시작하기"}
            </button>
          </div>
        </section>
      </main>

      {alertToast}
    </div>
  );
}

export function BingoBoardSection({
  board,
  boardSize,
  connectionLines,
  completedLines,
  newBingoCells,
  latestReceivedKeywords,
  animatedCells,
  completedCellIndexes,
  previewTools,
}: BingoBoardSectionProps) {
  const latestReceivedKeywordSet = new Set(latestReceivedKeywords);
  const newBingoCellSet = new Set(newBingoCells);
  const animatedCellSet = new Set(animatedCells);
  const completedCellSet = new Set(completedCellIndexes);
  const isBoardPreviewActive = previewTools?.activePreset != null;

  return (
    <section className="bingo-board-shell" aria-label="bingo board">
      {previewTools ? (
        <section
          className={`bingo-preview-panel ${isBoardPreviewActive ? "is-active" : ""}`}
          aria-label="board preview tools"
        >
          <div className="bingo-preview-panel__copy">
            <p className="bingo-preview-panel__eyebrow">테스트 모드 프리뷰</p>
            <strong>
              {isBoardPreviewActive
                ? "프리뷰 중에는 보드 실시간 동기화를 잠시 멈췄어요"
                : "1줄부터 올클리어까지 화면 상태를 바로 미리볼 수 있어요"}
            </strong>
            <span>실제 보드는 복원 버튼으로 바로 되돌릴 수 있습니다.</span>
          </div>
          <div className="bingo-preview-panel__actions">
            {previewTools.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`bingo-preview-panel__button ${
                  previewTools.activePreset === option.id ? "is-selected" : ""
                }`}
                onClick={() => previewTools.onSelectPreview(option.id)}
              >
                {option.label}
              </button>
            ))}
            {isBoardPreviewActive ? (
              <button
                type="button"
                className="bingo-preview-panel__button is-reset"
                onClick={previewTools.onResetPreview}
              >
                실전 보드 복원
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="bingo-board-shell__inner">
        <svg
          className="bingo-board__lines"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {connectionLines.map((coordinates, index) => (
            <line
              key={`connection-${index}`}
              {...coordinates}
              className="bingo-board__line bingo-board__line--grid"
            />
          ))}
          {completedLines.map((line) => {
            const coordinates = getLineCoordinates(line, boardSize);
            const key = `${line.type}-${line.index}`;

            return (
              <g key={key}>
                <line
                  {...coordinates}
                  className="bingo-board__line bingo-board__line--glow"
                />
                <line
                  {...coordinates}
                  className="bingo-board__line bingo-board__line--core"
                />
              </g>
            );
          })}
        </svg>

        <div
          className="bingo-board-grid"
          style={
            {
              "--board-size": boardSize,
            } as CSSProperties
          }
        >
          {board.map((cell, index) => {
            const isLineCell = completedCellSet.has(index);
            const isNew = newBingoCellSet.has(index);
            const isLatest = latestReceivedKeywordSet.has(cell.value);
            const isAnimated = animatedCellSet.has(index);
            const isActive = cell.status === 1;
            const isPlaceholder = !isLineCell && !isActive;
            const isReceived = !isPlaceholder && !isLineCell;
            const displayValue = cell.value;

            const classNames = [
              "bingo-board-cell",
              isPlaceholder ? "is-placeholder" : "",
              isReceived ? "is-received" : "",
              isLineCell ? "is-complete" : "",
              isNew ? "is-new" : "",
              isLatest ? "is-latest" : "",
              isAnimated ? "is-animated" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <article key={cell.id} className={classNames}>
                {isPlaceholder ? (
                  <div className="bingo-board-cell__brand">
                    <span>PseudoLab</span>
                  </div>
                ) : isLineCell ? (
                  <div className="bingo-board-cell__complete-badge">
                    <span className="bingo-board-cell__label">{displayValue}</span>
                  </div>
                ) : (
                  <span className="bingo-board-cell__label">{displayValue}</span>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function BingoCelebrationDialog({
  open,
  bingoMissionCount,
  bingoCount,
  markedKeywordCount,
  metPersonNum,
  onClose,
}: BingoCelebrationDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ className: "bingo-celebration-dialog" }}>
      <div className="bingo-celebration">
        <p className="bingo-celebration__eyebrow">MISSION CLEAR</p>
        <h2>빙고를 완성했어요</h2>
        <p className="bingo-celebration__copy">
          {bingoMissionCount}줄 미션을 달성했습니다. 더 많은 참가자와 키워드를 나누며
          보드를 계속 채워보세요.
        </p>
        <div className="bingo-celebration__stats">
          <article className="bingo-celebration__stat">
            <strong>{bingoCount}</strong>
            <span>완성한 줄</span>
          </article>
          <article className="bingo-celebration__stat">
            <strong>{markedKeywordCount}</strong>
            <span>열린 칸</span>
          </article>
          <article className="bingo-celebration__stat">
            <strong>{metPersonNum}</strong>
            <span>만난 참가자</span>
          </article>
        </div>
        <div className="bingo-celebration__actions">
          <button
            type="button"
            className="bingo-celebration__button bingo-celebration__button--primary"
            onClick={onClose}
          >
            계속 진행하기
          </button>
          <a
            className="bingo-celebration__button bingo-celebration__button--secondary"
            href="https://github.com/Pseudo-Lab/devfactory"
            target="_blank"
            rel="noopener noreferrer"
          >
            Devfactory Repo 보기
          </a>
        </div>
      </div>
    </Dialog>
  );
}
