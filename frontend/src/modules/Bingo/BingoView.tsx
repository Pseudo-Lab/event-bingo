import type { CSSProperties, ReactNode, Ref } from "react";
import characterIllustration from "../../assets/illustrations/character.svg";
import bingoCellStarFill from "../../assets/illustrations/Star 1.svg";
import bingoCellStarOutline from "../../assets/illustrations/Star 2.svg";
import { Dialog } from "../../components/ui/dialog";
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
  closeLabel: string;
  closeText: string;
  onClose: () => void;
};

type BingoLoadingScreenProps = {
  brandTitle: string;
  title: string;
  description: string;
};

type BingoCountdownScreenProps = {
  brandTitle: string;
  remainingTime: number;
  title: string;
  units: {
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  };
};

type KeywordSetupScreenProps = {
  exchangeKeywordCount: number;
  isInitializingBoard: boolean;
  keywords: Array<{ value: string; label: string }>;
  selectedKeywords: string[];
  copy: {
    title: string;
    description: string;
    ariaLabel: string;
    preparing: string;
    start: string;
  };
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
  latestReceivedMarker?: number;
  animatedCells: number[];
  completedCellIndexes: number[];
  sectionRef?: Ref<HTMLElement>;
  previewTools?: {
    options: Array<{ id: BoardPreviewPreset; label: string }>;
    activePreset: BoardPreviewPreset | null;
    onSelectPreview: (preset: BoardPreviewPreset) => void;
    onResetPreview: () => void;
    copy: {
      eyebrow: string;
      activeTitle: string;
      idleTitle: string;
      description: string;
      reset: string;
    };
  };
};

type BingoCelebrationDialogProps = {
  open: boolean;
  bingoCount: number;
  markedKeywordCount: number;
  metPersonNum: number;
  copy: {
    title: string;
    description: string;
    completedLines: string;
    openedCells: string;
    metParticipants: string;
    continue: string;
  };
  onClose: () => void;
};

export function NetworkingIllustration() {
  return (
    <img
      className="bingo-hero__illustration"
      src={characterIllustration}
      alt=""
    />
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
  closeLabel,
  closeText,
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
            aria-label={closeLabel}
          >
            {closeText}
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

export function BingoLoadingScreen({
  brandTitle,
  title,
  description,
}: BingoLoadingScreenProps) {
  return (
    <div className="bingo-game-page">
      <div className="bingo-game-page__mesh" aria-hidden="true" />
      <div className="bingo-loading-screen">
        <section className="bingo-loading-card" aria-label="bingo loading">
          <p className="bingo-loading-card__label">{brandTitle}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </section>
      </div>
    </div>
  );
}

export function BingoCountdownScreen({
  brandTitle,
  remainingTime,
  title,
  units,
}: BingoCountdownScreenProps) {
  const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingTime / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remainingTime / (1000 * 60)) % 60);
  const seconds = Math.floor((remainingTime / 1000) % 60);

  return (
    <div className="bingo-countdown">
      <div className="bingo-countdown__content">
        <p className="bingo-countdown__brand">{brandTitle}</p>
        <h1>{title}</h1>
        <div className="bingo-countdown__timer">
          {[
            { label: units.days, value: days },
            { label: units.hours, value: hours },
            { label: units.minutes, value: minutes },
            { label: units.seconds, value: seconds },
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
  exchangeKeywordCount,
  isInitializingBoard,
  keywords,
  selectedKeywords,
  copy,
  onToggleKeyword,
  onSubmit,
  alertToast,
}: KeywordSetupScreenProps) {
  return (
    <div className="keyword-setup-page">
      <div className="keyword-setup-page__mesh" aria-hidden="true" />
      <main className="keyword-setup-shell">
        <header className="keyword-setup-header">
          <div className="keyword-setup-header__title">
            <span className="keyword-setup-header__spark keyword-setup-header__spark--left" />
            <h1>{copy.title}</h1>
            <span className="keyword-setup-header__spark keyword-setup-header__spark--right" />
          </div>
          <p>{copy.description}</p>
        </header>

        <section className="keyword-setup-card" aria-label={copy.ariaLabel}>
          <div className="keyword-setup-card__scroller">
            <div className="keyword-setup-grid">
              {keywords.map((keyword) => {
                const isSelected = selectedKeywords.includes(keyword.value);

                return (
                  <button
                    key={keyword.value}
                    type="button"
                    className={`keyword-chip ${isSelected ? "is-selected" : ""}`}
                    onClick={() => onToggleKeyword(keyword.value)}
                    aria-pressed={isSelected}
                  >
                    {keyword.label}
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
              {isInitializingBoard ? copy.preparing : copy.start}
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
  latestReceivedMarker = 0,
  animatedCells,
  completedCellIndexes,
  sectionRef,
  previewTools,
}: BingoBoardSectionProps) {
  const latestReceivedKeywordSet = new Set(latestReceivedKeywords);
  const newBingoCellSet = new Set(newBingoCells);
  const animatedCellSet = new Set(animatedCells);
  const completedCellSet = new Set(completedCellIndexes);
  const isBoardPreviewActive = previewTools?.activePreset != null;

  return (
    <section ref={sectionRef} className="bingo-board-shell" aria-label="bingo board">
      {previewTools ? (
        <section
          className={`bingo-preview-panel ${isBoardPreviewActive ? "is-active" : ""}`}
          aria-label="board preview tools"
        >
          <div className="bingo-preview-panel__copy">
            <p className="bingo-preview-panel__eyebrow">{previewTools.copy.eyebrow}</p>
            <strong>
              {isBoardPreviewActive
                ? previewTools.copy.activeTitle
                : previewTools.copy.idleTitle}
            </strong>
            <span>{previewTools.copy.description}</span>
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
                {previewTools.copy.reset}
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
              <article
                key={`${cell.id}-${isLatest ? latestReceivedMarker : 0}`}
                className={classNames}
              >
                <div className="bingo-board-cell__inner">
                  {isLineCell ? (
                    <div
                      className="bingo-board-cell__art"
                      aria-hidden="true"
                      style={
                        {
                          "--cell-gap-mask": `url("${bingoCellStarFill}")`,
                        } as CSSProperties
                      }
                    >
                      <img
                        className="bingo-board-cell__star bingo-board-cell__star--outline"
                        src={bingoCellStarOutline}
                        alt=""
                      />
                      <span className="bingo-board-cell__star-gap" />
                      <img
                        className="bingo-board-cell__star bingo-board-cell__star--fill"
                        src={bingoCellStarFill}
                        alt=""
                      />
                    </div>
                  ) : null}

                  <span className="bingo-board-cell__label">{displayValue}</span>
                </div>
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
  bingoCount,
  markedKeywordCount,
  metPersonNum,
  copy,
  onClose,
}: BingoCelebrationDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="bingo-celebration-dialog w-[min(92vw,32rem)]"
    >
      <div className="bingo-celebration">
        <p className="bingo-celebration__eyebrow">MISSION CLEAR</p>
        <h2>{copy.title}</h2>
        <p className="bingo-celebration__copy">{copy.description}</p>
        <div className="bingo-celebration__stats">
          <article className="bingo-celebration__stat">
            <strong>{bingoCount}</strong>
            <span>{copy.completedLines}</span>
          </article>
          <article className="bingo-celebration__stat">
            <strong>{markedKeywordCount}</strong>
            <span>{copy.openedCells}</span>
          </article>
          <article className="bingo-celebration__stat">
            <strong>{metPersonNum}</strong>
            <span>{copy.metParticipants}</span>
          </article>
        </div>
        <div className="bingo-celebration__actions">
          <button
            type="button"
            className="bingo-celebration__button bingo-celebration__button--primary"
            onClick={onClose}
          >
            {copy.continue}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
