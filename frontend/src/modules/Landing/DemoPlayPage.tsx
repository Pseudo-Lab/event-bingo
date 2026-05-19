import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import bingoNetworkingWordmark from "../../assets/illustrations/Bingo Networking.svg";
import characterIllustration from "../../assets/illustrations/character.svg";
import type { BingoCell, CompletedLine } from "../Bingo/bingoGameTypes";
import { BingoBoardSection } from "../Bingo/BingoView";
import { createBoardConnectionLines, getCellsInLine } from "../Bingo/bingoGameUtils";
import "../Bingo/BingoGame.css";
import {
  DEMO_PLAY_GOAL_LINES,
  DEMO_PLAY_KEYWORDS,
  DEMO_PLAY_MAX_SELECTED_KEYWORDS,
  DEMO_PLAY_MIN_SELECTED_KEYWORDS,
  DEMO_PLAY_BOARD_VARIANTS,
  type DemoPlayExchangeStep,
  applyDemoPlayExchangeStep,
  createDemoPlayBoard,
  createDemoPlayExchangeSteps,
  getDemoPlayBoardVariantIndex,
} from "./demoPlayUtils";
import { createAnalyticsId, SiteAnalyticsScope, useSiteAnalytics } from "./siteAnalytics";

type DemoPlayState = {
  board: BingoCell[];
  completedLines: CompletedLine[];
  latestReceivedKeywords: string[];
  latestStep: DemoPlayExchangeStep | null;
};

const PC_CANVAS_WIDTH = 1920;
const PC_CANVAS_HEIGHT = 1080;
const PC_GAME_CANVAS_HEIGHT = 1080;
const DEMO_SEND_ALERT_DURATION_MS = 750;
const DEMO_RECEIVE_ALERT_DURATION_MS = 1300;
const DEMO_GOAL_OVERLAY_DURATION_MS = 2000;

type DemoGuidanceMode = "send" | "receive";

const useViewportScale = (canvasHeight: number, fitWidthOnly = false) => {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? PC_CANVAS_WIDTH : window.innerWidth,
    height: typeof window === "undefined" ? canvasHeight : window.innerHeight,
  }));

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (fitWidthOnly) {
    return Math.min(1, viewport.width / PC_CANVAS_WIDTH);
  }

  return Math.min(viewport.width / PC_CANVAS_WIDTH, viewport.height / canvasHeight);
};

const useIsMobileViewport = () => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < 768
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

const PcDesignStage = ({
  children,
  canvasHeight = PC_CANVAS_HEIGHT,
  scrollable = false,
}: {
  children: ReactNode;
  canvasHeight?: number;
  scrollable?: boolean;
}) => {
  const scale = useViewportScale(canvasHeight, scrollable);
  const scaledWidth = PC_CANVAS_WIDTH * scale;
  const scaledHeight = canvasHeight * scale;

  if (scrollable) {
    return (
      <div
        data-demo-play-scroll="true"
        className="h-screen overflow-y-auto overflow-x-hidden bg-[#4fc39b]"
      >
        <div
          className="relative mx-auto"
          style={{
            width: scaledWidth,
            height: scaledHeight,
          }}
        >
          <div
            data-demo-stage="true"
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: PC_CANVAS_WIDTH,
              height: canvasHeight,
              transform: `scale(${scale})`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[#4fc39b]">
      <div
        data-demo-stage="true"
        className="absolute origin-top-left"
        style={{
          width: PC_CANVAS_WIDTH,
          height: canvasHeight,
          left: `max(0px, calc((100vw - ${scaledWidth}px) / 2))`,
          top: `max(0px, calc((100vh - ${scaledHeight}px) / 2))`,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const buildDemoState = (
  baseBoard: BingoCell[],
  steps: DemoPlayExchangeStep[],
  completedStepCount: number
): DemoPlayState => {
  let board = baseBoard;
  let completedLines: CompletedLine[] = [];
  let latestReceivedKeywords: string[] = [];
  let latestStep: DemoPlayExchangeStep | null = null;

  steps.slice(0, completedStepCount).forEach((step) => {
    const outcome = applyDemoPlayExchangeStep(board, step);
    board = outcome.board;
    completedLines = outcome.completedLines;
    latestReceivedKeywords = outcome.latestHostReceivedKeywords;
    latestStep = step;
  });

  return {
    board,
    completedLines,
    latestReceivedKeywords,
    latestStep,
  };
};

const getCompletedCellIndexes = (completedLines: CompletedLine[]) => {
  const indexes = new Set<number>();
  completedLines.forEach((line) => {
    getCellsInLine(line.type, line.index, 5).forEach((index) => indexes.add(index));
  });
  return indexes;
};

const DemoBadgeLink = ({ className = "" }: { className?: string }) => (
  <Link
    to="/demo/play"
    className={`inline-flex h-[34px] items-center rounded-full border border-white/45 bg-white/18 px-[17px] text-[15px] font-black tracking-[-0.04em] text-white shadow-[0_10px_24px_rgba(7,105,69,0.14)] transition hover:bg-white/28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${className}`}
  >
    데모 이벤트
  </Link>
);

const KeywordSelector = ({
  selectedKeywords,
  onToggleKeyword,
  canStart,
  onStart,
}: {
  selectedKeywords: string[];
  onToggleKeyword: (keyword: string) => void;
  canStart: boolean;
  onStart: () => void;
}) => (
  <section className="absolute left-[623px] top-[132px] h-[737px] w-[675px]">
    <div className="absolute left-0 top-[52px] w-full text-center">
      <p className="text-[56px] leading-none text-[#9cee69]">✦</p>
      <h1 className="mt-1 text-[52px] font-black leading-none tracking-[-0.07em] text-[#076945]">
        관심사 선택
      </h1>
      <p className="mt-7 text-[22px] font-black tracking-[-0.04em] text-white/85">
        당신의 관심사를 잘 표현할 수 있는 키워드를 3개 선택하세요.
      </p>
      <p className="mx-auto mt-[14px] w-[570px] rounded-full bg-white/18 px-[18px] py-[10px] text-[16px] font-black leading-[24px] tracking-[-0.04em] text-white/80">
        실제 행사에서는 참가자끼리 키워드를 주고받으며 빙고판이 채워집니다.
      </p>
    </div>

    <div className="absolute left-0 top-[237px] h-[525px] rounded-[20px] bg-white px-[40.5px] pb-[18px] pt-[36.5px] shadow-soft">
      <div className="grid grid-cols-3 gap-x-[10px] gap-y-[10px]">
      {DEMO_PLAY_KEYWORDS.slice(0, 15).map((keyword) => {
        const isSelected = selectedKeywords.includes(keyword);

        return (
          <button
            key={keyword}
            type="button"
            className={`h-[60px] w-[193px] rounded-[29.5px] border px-6 text-[20px] font-black tracking-[-0.04em] transition ${
              isSelected
                ? "border-[#4fc39a] bg-[#28d791] text-white"
                : "border-[#4fc399] bg-white text-[#4fc399] hover:bg-brand-50"
            }`}
            onClick={() => onToggleKeyword(keyword)}
          >
            {keyword}
          </button>
        );
      })}
      </div>

      <Button
        type="button"
        className="mt-[31px] h-[65px] w-[600px] rounded-[32.5px] !bg-[#4fc399] text-[22px] font-black tracking-[-0.04em] !text-white hover:!bg-[#28d791] disabled:!bg-[#a7c4c8] disabled:!opacity-100"
        disabled={!canStart}
        onClick={onStart}
      >
        빙고 시작하기
      </Button>
      {!canStart ? (
        <p className="mt-[8px] text-center text-[18px] font-black leading-[24px] text-red-700">
          키워드는 {DEMO_PLAY_MIN_SELECTED_KEYWORDS}개 선택해야 합니다.
        </p>
      ) : null}
    </div>
  </section>
);

const MobileKeywordSelector = ({
  selectedKeywords,
  onToggleKeyword,
  canStart,
  onStart,
}: {
  selectedKeywords: string[];
  onToggleKeyword: (keyword: string) => void;
  canStart: boolean;
  onStart: () => void;
}) => (
  <main className="fixed inset-0 flex overflow-hidden overscroll-none bg-[#4fc39b] px-5 pb-4 pt-5 text-slate-950">
    <div className="flex h-full w-full flex-col overflow-hidden">
    <div className="flex items-center justify-between gap-3">
      <Link to="/" aria-label="Bingo Networking 홈으로 이동" className="block">
        <img src={bingoNetworkingWordmark} alt="Bingo Networking" className="h-auto w-[148px]" />
      </Link>
      <DemoBadgeLink className="h-[30px] px-3 text-[12px]" />
    </div>

    <section className="mt-7">
      <p className="text-[30px] leading-none text-[#9cee69]">✦</p>
      <h1 className="mt-1 text-[36px] font-black leading-none tracking-[-0.07em] text-[#076945]">
        관심사 선택
      </h1>
      <p className="mt-3 text-[15px] font-black leading-[22px] tracking-[-0.04em] text-white/90">
        행사장에서 나를 표현할 키워드 3개를 골라주세요.
      </p>
    </section>

    <section className="mt-5 rounded-[22px] bg-white p-3 shadow-soft">
      <div className="grid grid-cols-3 gap-2">
        {DEMO_PLAY_KEYWORDS.slice(0, 15).map((keyword) => {
          const isSelected = selectedKeywords.includes(keyword);

          return (
            <button
              key={keyword}
              type="button"
              className={`h-[38px] rounded-[19px] border px-2 text-[12px] font-black tracking-[-0.04em] transition ${ 
                isSelected
                  ? "border-[#4fc39a] bg-[#28d791] text-white shadow-[0_8px_16px_rgba(40,215,145,0.22)]"
                  : "border-[#4fc399] bg-white text-[#4fc399]"
              }`}
              onClick={() => onToggleKeyword(keyword)}
            >
              {keyword}
            </button>
          );
        })}
      </div>
    </section>

    <div className="-mx-5 mt-auto min-h-[158px] border-t border-white/20 bg-[#4fc39b]/95 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <div className="mb-2 flex items-center justify-between text-[14px] font-black tracking-[-0.04em] text-[#076945]">
        <span>선택한 키워드</span>
        <span>{selectedKeywords.length}/{DEMO_PLAY_MIN_SELECTED_KEYWORDS}</span>
      </div>
      <Button
        type="button"
        className="h-[48px] w-full rounded-[24px] !bg-[#076945] text-[16px] font-black tracking-[-0.04em] !text-white hover:!bg-[#00905b] disabled:!bg-[#a7c4c8] disabled:!opacity-100"
        disabled={!canStart}
        onClick={onStart}
      >
        빙고 시작하기
      </Button>
      <p className="mt-2 min-h-[18px] text-center text-[13px] font-black text-[#076945]/75">
        {!canStart ? `키워드는 ${DEMO_PLAY_MIN_SELECTED_KEYWORDS}개 선택해야 합니다.` : ""}
      </p>
    </div>
    </div>
  </main>
);

const ExchangeCard = ({
  step,
  index,
  isActive,
  isDone,
}: {
  step: DemoPlayExchangeStep;
  index: number;
  isActive: boolean;
  isDone: boolean;
}) => {
  const personName = step.senderId === "host" ? step.receiverName : step.senderName;

  return (
    <article
      className={`border-b border-[#118f4e]/35 py-[22px] transition first:pt-0 last:border-b-0 last:pb-0 ${
        isActive
          ? "text-white"
          : isDone
            ? "text-white"
            : "text-white/80"
      }`}
    >
      <div className="flex items-center gap-[7px]">
        <p className="min-w-0 text-[16px] font-black leading-none tracking-[-0.05em]">
          <span className="inline-flex h-[21px] w-[21px] items-center justify-center rounded-full bg-[#ddff57] text-[13px] font-black text-[#00905b]">
            {index + 1}
          </span>
        </p>
        <strong className="text-[18px] font-black leading-none tracking-[-0.05em] text-white">
          {personName} 님
        </strong>
      </div>
      <div className="mt-[15px] flex flex-wrap gap-x-[5px] gap-y-[4px]">
        {step.sentKeywords.map((keyword, keywordIndex) => (
          <span
            key={`${step.id}-${keyword}-${keywordIndex}`}
            className="rounded-[5px] bg-[#00905b] px-[6px] py-[3px] text-[14px] font-black leading-[15px] text-[#28d791]"
          >
            {keyword}
          </span>
        ))}
      </div>
    </article>
  );
};

const DemoSendOverlay = ({
  open,
  receiverName,
  onClose,
}: {
  open: boolean;
  receiverName: string;
  onClose: () => void;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#076945]/24 backdrop-blur-[1px]">
      <article
        className="w-[500px] rounded-[30px] border border-[#ddff57]/70 bg-[#fffde8]/95 px-[40px] py-[34px] text-center shadow-[0_26px_60px_rgba(7,105,69,0.28)]"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-[16px]">
          <span className="inline-flex h-[29px] items-center rounded-[15px] bg-[#00905b] px-[16px] text-[15px] font-black tracking-[-0.04em] text-white">
            보낸 키워드
          </span>
          <button
            type="button"
            className="text-[15px] font-black tracking-[-0.04em] text-[#076945]/70 hover:text-[#076945]"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
        <p className="mt-[24px] text-[28px] font-black leading-[36px] tracking-[-0.06em] text-[#076945]">
          {receiverName} 님에게
          <br />
          내 키워드를 보냈어요
        </p>
      </article>
    </div>
  );
};

const DemoGuidanceSpotlight = ({ mode }: { mode: DemoGuidanceMode }) => {
  const target =
    mode === "send"
      ? { left: 216, top: 341, width: 342, height: 78 }
      : { left: 421, top: 345, width: 132, height: 66 };
  const padding = 18;
  const left = target.left - padding;
  const top = target.top - padding;
  const right = PC_CANVAS_WIDTH - target.left - target.width - padding;
  const bottom = PC_GAME_CANVAS_HEIGHT - target.top - target.height - padding;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute left-0 top-0 w-full bg-slate-950/45" style={{ height: top }} />
      <div className="absolute left-0 bg-slate-950/45" style={{ top, width: left, height: target.height + padding * 2 }} />
      <div className="absolute right-0 bg-slate-950/45" style={{ top, width: right, height: target.height + padding * 2 }} />
      <div className="absolute bottom-0 left-0 w-full bg-slate-950/45" style={{ height: bottom }} />
      <div
        className="absolute rounded-[39px] ring-[5px] ring-[#ddff57]/70 shadow-[0_0_0_999px_rgba(15,23,42,0.08),0_0_34px_rgba(221,255,87,0.58)]"
        style={{
          left,
          top,
          width: target.width + padding * 2,
          height: target.height + padding * 2,
        }}
      />
    </div>
  );
};

const DemoGuidanceCallout = () => (
  <div className="pointer-events-none absolute left-[244px] top-[268px] z-30 rounded-[18px] border border-[#ddff57]/70 bg-[#fffde8] px-[20px] py-[12px] text-[17px] font-black leading-[22px] tracking-[-0.04em] text-[#076945] shadow-[0_18px_36px_rgba(7,105,69,0.22)]">
    먼저 상대에게 내 키워드를 보내보세요.
    <span className="absolute bottom-[-8px] right-[50px] h-[16px] w-[16px] rotate-45 border-b border-r border-[#ddff57]/70 bg-[#fffde8]" />
  </div>
);

const DemoBoard = ({
  board,
  completedLines,
  latestReceivedKeywords,
  isGoalComplete,
  useDemoScale = true,
  showGoalOverlay,
  onDismissGoalOverlay,
  receiveOverlay,
}: {
  board: BingoCell[];
  completedLines: CompletedLine[];
  latestReceivedKeywords: string[];
  isGoalComplete: boolean;
  useDemoScale?: boolean;
  showGoalOverlay: boolean;
  onDismissGoalOverlay: () => void;
  receiveOverlay: {
    open: boolean;
    senderName: string;
    keywords: string[];
  };
}) => {
  const completedCellIndexes = useMemo(
    () => getCompletedCellIndexes(completedLines),
    [completedLines]
  );
  const latestKeywordSet = useMemo(
    () => new Set(latestReceivedKeywords),
    [latestReceivedKeywords]
  );
  const connectionLines = useMemo(() => createBoardConnectionLines(5), []);
  const completedCellIndexesList = useMemo(
    () => Array.from(completedCellIndexes),
    [completedCellIndexes]
  );
  const latestCellIndexes = useMemo(
    () =>
      board
        .map((cell, index) => (latestKeywordSet.has(cell.value) ? index : -1))
        .filter((index) => index >= 0),
    [board, latestKeywordSet]
  );

  return (
    <div className={useDemoScale ? "demo-play-board relative w-[675px]" : "relative w-full"}>
      <BingoBoardSection
        board={board}
        boardSize={5}
        connectionLines={connectionLines}
        completedLines={completedLines}
        newBingoCells={latestCellIndexes}
        latestReceivedKeywords={latestReceivedKeywords}
        animatedCells={latestCellIndexes}
        completedCellIndexes={completedCellIndexesList}
      />
      {receiveOverlay.open && !isGoalComplete ? (
        <div className="absolute inset-4 z-20 flex items-center justify-center rounded-[31px] bg-[#076945]/45 text-center text-white backdrop-blur-[2px]">
          <div className="w-[410px] rounded-[26px] border border-[#ddff57]/70 bg-[#fffde8]/95 px-[34px] py-[30px] shadow-[0_22px_48px_rgba(7,105,69,0.28)]">
            <p className="text-[16px] font-black leading-none tracking-[-0.04em] text-[#00905b]">
              받은 키워드
            </p>
            <p className="mt-[12px] text-[25px] font-black leading-[32px] tracking-[-0.06em] text-[#076945]">
              {receiveOverlay.senderName} 님에게
              <br />
              키워드를 받았어요
            </p>
            <div className="mt-[20px] flex flex-wrap justify-center gap-[8px]">
              {receiveOverlay.keywords.map((keyword, index) => (
                <span
                  key={`${keyword}-${index}`}
                  className="rounded-[999px] bg-[#00905b] px-[13px] py-[7px] text-[15px] font-black leading-none tracking-[-0.04em] text-[#ddff57]"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {isGoalComplete && showGoalOverlay ? (
        <button
          type="button"
          className="absolute inset-4 z-30 flex items-center justify-center rounded-[31px] bg-[#076945]/55 text-center text-white backdrop-blur-[2px]"
          onClick={onDismissGoalOverlay}
          aria-label="목표 달성 안내 닫기"
        >
          <span>
            <p className="text-[52px] font-black leading-none text-[#ddff57]">✦</p>
            <p className="mt-5 text-[34px] font-black tracking-[-0.08em]">목표 달성!</p>
            <p className="mt-3 text-[18px] font-black tracking-[-0.04em] text-white/80">
              키워드 교환으로 빙고를 완성했어요.
            </p>
          </span>
        </button>
      ) : null}
    </div>
  );
};

const MobileDemoGame = ({
  demoState,
  nextStep,
  isComplete,
  actionInputLabel,
  actionButtonLabel,
  guidanceMode,
  metParticipantCount,
  doneGivenCount,
  doneReceivedCount,
  selectedKeywords,
  boardSectionRef,
  onNext,
  onReplay,
}: {
  demoState: DemoPlayState;
  nextStep: DemoPlayExchangeStep | null;
  completedStepCount: number;
  isComplete: boolean;
  actionInputLabel: string;
  actionButtonLabel: string;
  guidanceMode: DemoGuidanceMode | null;
  metParticipantCount: number;
  doneGivenCount: number;
  doneReceivedCount: number;
  selectedKeywords: string[];
  boardSectionRef: RefObject<HTMLDivElement>;
  onNext: () => void;
  onReplay: () => void;
}) => {
  const progressRate = Math.min(
    100,
    Math.round((demoState.completedLines.length / DEMO_PLAY_GOAL_LINES) * 100)
  );
  const isSendGuide = guidanceMode === "send";
  const isReceiveGuide = guidanceMode === "receive";

  return (
    <div className="bingo-game-page">
      <div className="bingo-game-page__mesh" aria-hidden="true" />
      {guidanceMode ? (
        <div className="pointer-events-none fixed inset-0 z-20 bg-slate-950/46" aria-hidden="true" />
      ) : null}

      <main className="bingo-game-shell pb-[150px]">
        <header className="bingo-game-header">
          <Link to="/" className="bingo-game-header__brand" aria-label="Bingo Networking 홈으로 이동">
            <img src={bingoNetworkingWordmark} alt="Bingo Networking" />
          </Link>
        </header>

        <section className="bingo-game-top">
          <article className="bingo-card bingo-hero">
            <p className="bingo-hero__identity">홍길동 님</p>
            <div className="bingo-hero__content">
              <div className="bingo-hero__copy">
                <h1>
                  빙고를 채우며
                  <br />
                  소통해봐요!
                </h1>
                {isSendGuide ? (
                  <div className="relative z-30 mb-3 mt-4 rounded-[16px] border border-[#ddff57]/70 bg-[#fffde8] px-4 py-3 text-[15px] font-black leading-[21px] tracking-[-0.04em] text-[#076945] shadow-[0_12px_28px_rgba(7,105,69,0.18)]">
                    먼저 상대에게 내 키워드를 보내보세요.
                  </div>
                ) : null}
                {isReceiveGuide ? (
                  <div className="relative z-30 mb-3 mt-4 rounded-[16px] border border-[#ddff57]/70 bg-[#fffde8] px-4 py-3 text-[15px] font-black leading-[21px] tracking-[-0.04em] text-[#076945] shadow-[0_12px_28px_rgba(7,105,69,0.18)]">
                    키워드를 주고받으면 서로의 빙고판이 채워져요.
                  </div>
                ) : null}
                <form
                  className={"bingo-hero__form " + (guidanceMode ? "relative z-30 ring-[5px] ring-[#ddff57]/70 shadow-[0_0_0_10px_rgba(221,255,87,0.18),0_18px_40px_rgba(7,105,69,0.24)]" : "")}
                  onSubmit={(event) => {
                    event.preventDefault();
                    onNext();
                  }}
                >
                  <div className="bingo-hero__form-field">
                    <input
                      value={
                        nextStep?.senderId === "guest"
                          ? nextStep.senderName + " 님이 보냈어요"
                          : actionInputLabel
                      }
                      aria-label={nextStep?.senderId === "guest" ? "받은 키워드" : "상대방 이름 검색"}
                      readOnly
                    />
                  </div>
                  <button type="submit" disabled={isComplete}>
                    {actionButtonLabel}
                  </button>
                </form>
              </div>
            </div>
          </article>

          <article className="bingo-card bingo-stats">
            <span className="bingo-stats__badge">개인전</span>
            <div className="bingo-stats__score">
              <strong>{progressRate}%</strong>
              <p>빙고 완성률</p>
            </div>
            <div className="bingo-stats__progress" aria-hidden="true">
              <span style={{ width: progressRate + "%" }} />
            </div>
            <section className="bingo-stats__selected" aria-label="내가 고른 키워드">
              <div className="bingo-stats__selected-head">
                <h3>내가 고른 키워드</h3>
                <strong>{selectedKeywords.length}개</strong>
              </div>
              <div className="bingo-stats__selected-list">
                {selectedKeywords.map((keyword) => (
                  <span key={keyword} className="bingo-stats__selected-chip">
                    {keyword}
                  </span>
                ))}
              </div>
            </section>
            <dl className="bingo-stats__meta">
              <div>
                <dt>수집한 키워드</dt>
                <dd>{demoState.board.filter((cell) => cell.status === 1).length}/24</dd>
              </div>
              <div>
                <dt>만난 참가자</dt>
                <dd>{metParticipantCount}명</dd>
              </div>
            </dl>
          </article>
        </section>

        <div ref={boardSectionRef} className="relative z-10 scroll-mt-4">
          <DemoBoard
            board={demoState.board}
            completedLines={demoState.completedLines}
            latestReceivedKeywords={demoState.latestReceivedKeywords}
            isGoalComplete={isComplete}
            useDemoScale={false}
            showGoalOverlay={isComplete}
            onDismissGoalOverlay={() => undefined}
            receiveOverlay={{
              open: false,
              senderName: "",
              keywords: [],
            }}
          />
        </div>

        <section className="relative z-10 mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[18px] bg-[#076945] p-4 text-white shadow-soft">
            <h2 className="text-[16px] font-black tracking-[-0.04em]">
              내가 준 사람 <span className="text-[#ff5757]">{doneGivenCount}</span>
            </h2>
          </div>
          <div className="rounded-[18px] bg-[#076945] p-4 text-white shadow-soft">
            <h2 className="text-[16px] font-black tracking-[-0.04em]">
              나에게 보낸 사람 <span className="text-[#ff5757]">{doneReceivedCount}</span>
            </h2>
          </div>
        </section>

        {isComplete ? (
          <div className="relative z-10 mt-4 text-center">
            <Button
              type="button"
              className="h-[48px] rounded-[24px] !bg-[#ddff57] px-6 text-[16px] font-black !text-[#076945]"
              onClick={onReplay}
            >
              다시 체험하기
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
};
const DemoPlayPageContent = ({ demoRunId }: { demoRunId: string }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { track } = useSiteAnalytics();
  const isGameRoute = location.pathname.endsWith("/game");
  const isMobileViewport = useIsMobileViewport();
  const selectedKeywordsFromQuery = useMemo(() => {
    const keywords = searchParams.get("keywords") ?? "";
    return keywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .filter((keyword, index, list) => list.indexOf(keyword) === index)
      .slice(0, DEMO_PLAY_MAX_SELECTED_KEYWORDS);
  }, [searchParams]);
  const boardVariantIndex = useMemo(
    () => getDemoPlayBoardVariantIndex(String(Math.random() * DEMO_PLAY_BOARD_VARIANTS.length)),
    []
  );
  const [draftKeywords, setDraftKeywords] = useState<string[]>([]);
  const [completedStepCount, setCompletedStepCount] = useState(0);
  const alertTimeoutRef = useRef<number | null>(null);
  const [sendAlert, setSendAlert] = useState({
    open: false,
    receiverName: "",
  });
  const [receiveBoardAlert, setReceiveBoardAlert] = useState({
    open: false,
    senderName: "",
    keywords: [] as string[],
  });
  const [isGoalOverlayVisible, setIsGoalOverlayVisible] = useState(true);
  const hasTrackedReadyRef = useRef(false);
  const hasTrackedGoalRef = useRef(false);
  const gameStartedAtRef = useRef(Date.now());
  const mobileBoardSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        window.clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  const activeKeywords = isGameRoute ? selectedKeywordsFromQuery : draftKeywords;
  const activeKeywordKey = activeKeywords.join("|");

  useEffect(() => {
    setCompletedStepCount(0);
    setSendAlert((currentAlert) => ({ ...currentAlert, open: false }));
    setReceiveBoardAlert((currentAlert) => ({ ...currentAlert, open: false }));
    setIsGoalOverlayVisible(true);
    hasTrackedReadyRef.current = false;
    hasTrackedGoalRef.current = false;
    gameStartedAtRef.current = Date.now();
    if (alertTimeoutRef.current) {
      window.clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
  }, [activeKeywordKey, boardVariantIndex, isGameRoute]);

  useEffect(() => {
    if (isGameRoute || draftKeywords.length < DEMO_PLAY_MIN_SELECTED_KEYWORDS || hasTrackedReadyRef.current) {
      return;
    }

    hasTrackedReadyRef.current = true;
    track("demo_keyword_selection_ready", {
      selected_count: draftKeywords.length,
    });
  }, [draftKeywords.length, isGameRoute, track]);

  const baseBoard = useMemo(
    () =>
      createDemoPlayBoard(activeKeywords, {
        boardVariantIndex,
        shuffleRemaining: false,
      }),
    [activeKeywords, boardVariantIndex]
  );
  const exchangeSteps = useMemo(
    () =>
      createDemoPlayExchangeSteps(baseBoard, activeKeywords, {
        boardVariantIndex,
      }),
    [activeKeywords, baseBoard, boardVariantIndex]
  );
  const demoState = useMemo(
    () => buildDemoState(baseBoard, exchangeSteps, completedStepCount),
    [baseBoard, completedStepCount, exchangeSteps]
  );

  const isComplete = completedStepCount >= exchangeSteps.length;

  useEffect(() => {
    if (!isComplete) {
      setIsGoalOverlayVisible(true);
      return;
    }

    setIsGoalOverlayVisible(true);
    if (!hasTrackedGoalRef.current) {
      hasTrackedGoalRef.current = true;
      track("demo_goal_completed", {
        total_steps: exchangeSteps.length,
        final_completed_line_count: demoState.completedLines.length,
        elapsed_ms_from_game_view: Date.now() - gameStartedAtRef.current,
        demo_run_id: demoRunId,
        board_layout_variant_id: boardVariantIndex,
      });
    }
    const goalOverlayTimer = window.setTimeout(() => {
      setIsGoalOverlayVisible(false);
    }, DEMO_GOAL_OVERLAY_DURATION_MS);

    return () => window.clearTimeout(goalOverlayTimer);
  }, [boardVariantIndex, demoRunId, demoState.completedLines.length, exchangeSteps.length, isComplete, track]);

  const nextStep = exchangeSteps[completedStepCount] ?? null;
  const canStart = draftKeywords.length >= DEMO_PLAY_MIN_SELECTED_KEYWORDS;
  const actionInputLabel = nextStep
    ? nextStep.senderId === "host"
      ? nextStep.receiverName
      : `${nextStep.senderName} 답장`
    : "참가자 이름 검색";
  const actionButtonLabel = isComplete
    ? "완료"
    : nextStep?.senderId === "guest"
      ? "교환 확인"
      : "보내기";
  const guidanceMode: DemoGuidanceMode | null =
    isGameRoute && completedStepCount === 0 && nextStep?.senderId === "host"
      ? "send"
      : isGameRoute && completedStepCount === 1 && nextStep?.senderId === "guest"
        ? "receive"
        : null;
  const shouldShowSendGuide = guidanceMode === "send";
  const shouldShowReceiveGuide = guidanceMode === "receive";
  const doneGivenCount = exchangeSteps.filter(
    (step, index) => step.senderId === "host" && index < completedStepCount
  ).length;
  const doneReceivedCount = exchangeSteps.filter(
    (step, index) => step.senderId === "guest" && index < completedStepCount
  ).length;
  const metParticipantCount = new Set(
    exchangeSteps
      .slice(0, completedStepCount)
      .map((step) => (step.senderId === "host" ? step.receiverName : step.senderName))
  ).size;
  const completedGivenSteps = exchangeSteps
    .map((step, index) => ({ step, index }))
    .filter(({ step, index }) => step.senderId === "host" && index < completedStepCount);
  const completedReceivedSteps = exchangeSteps
    .map((step, index) => ({ step, index }))
    .filter(({ step, index }) => step.senderId === "guest" && index < completedStepCount);

  const handleToggleKeyword = (keyword: string) => {
    if (isGameRoute) {
      return;
    }

    setDraftKeywords((currentKeywords) => {
      if (currentKeywords.includes(keyword)) {
        return currentKeywords.filter((item) => item !== keyword);
      }
      if (currentKeywords.length >= DEMO_PLAY_MAX_SELECTED_KEYWORDS) {
        return currentKeywords;
      }
      return [...currentKeywords, keyword];
    });
  };

  const handleStart = () => {
    if (!canStart) {
      return;
    }
    track("demo_start_clicked", {
      selected_count: draftKeywords.length,
    });
    const keywordQuery = draftKeywords.map(encodeURIComponent).join(",");
    navigate(`/demo/play/game?keywords=${keywordQuery}`);
  };

  const handleNext = () => {
    if (!isGameRoute) {
      return;
    }
    if (nextStep) {
      if (alertTimeoutRef.current) {
        window.clearTimeout(alertTimeoutRef.current);
      }

      if (nextStep.senderId === "host") {
        setReceiveBoardAlert((currentAlert) => ({ ...currentAlert, open: false }));
        setSendAlert({
          open: true,
          receiverName: nextStep.receiverName,
        });
      } else {
        setSendAlert((currentAlert) => ({ ...currentAlert, open: false }));
        setReceiveBoardAlert({
          open: true,
          senderName: nextStep.senderName,
          keywords: nextStep.sentKeywords,
        });
      }
      alertTimeoutRef.current = window.setTimeout(() => {
        setSendAlert((currentAlert) => ({ ...currentAlert, open: false }));
        setReceiveBoardAlert((currentAlert) => ({ ...currentAlert, open: false }));
        alertTimeoutRef.current = null;
      }, nextStep.senderId === "host" ? DEMO_SEND_ALERT_DURATION_MS : DEMO_RECEIVE_ALERT_DURATION_MS);

      const nextDemoState = buildDemoState(
        baseBoard,
        exchangeSteps,
        Math.min(completedStepCount + 1, exchangeSteps.length)
      );
      const nextMetParticipantCount = new Set(
        exchangeSteps
          .slice(0, completedStepCount + 1)
          .map((step) => (step.senderId === "host" ? step.receiverName : step.senderName))
      ).size;
      track("demo_exchange_advanced", {
        step_index: completedStepCount,
        step_id: nextStep.id,
        action_type: nextStep.senderId === "host" ? "send" : "receive",
        sent_keyword_count: nextStep.sentKeywords.length,
        matched_keyword_count: nextStep.hostReceivedKeywords.length,
        completed_line_count_after: nextDemoState.completedLines.length,
        new_line_count: Math.max(
          0,
          nextDemoState.completedLines.length - demoState.completedLines.length
        ),
        met_participant_count: nextMetParticipantCount,
        demo_run_id: demoRunId,
      });
    }
    const shouldScrollToBoard =
      isMobileViewport && nextStep?.senderId === "guest" && mobileBoardSectionRef.current;

    setCompletedStepCount((currentCount) =>
      Math.min(currentCount + 1, exchangeSteps.length)
    );

    if (shouldScrollToBoard) {
      window.setTimeout(() => {
        mobileBoardSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 80);
    }
  };

  const handleReplay = () => {
    track(
      "demo_replay_clicked",
      {
        completed_step_count: completedStepCount,
        completed_line_count: demoState.completedLines.length,
        elapsed_ms_from_game_view: Date.now() - gameStartedAtRef.current,
        demo_run_id: demoRunId,
      },
      { beacon: true }
    );
    window.location.reload();
  };

  const handleCloseSendAlert = () => {
    setSendAlert((currentAlert) => ({ ...currentAlert, open: false }));
    setReceiveBoardAlert((currentAlert) => ({ ...currentAlert, open: false }));
    if (alertTimeoutRef.current) {
      window.clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
  };

  const isInvalidGameEntry =
    isGameRoute && selectedKeywordsFromQuery.length < DEMO_PLAY_MIN_SELECTED_KEYWORDS;

  if (isInvalidGameEntry) {
    return <Navigate to="/demo/play" replace />;
  }

  if (!isGameRoute) {
    if (isMobileViewport) {
      return (
        <MobileKeywordSelector
          selectedKeywords={draftKeywords}
          onToggleKeyword={handleToggleKeyword}
          canStart={canStart}
          onStart={handleStart}
        />
      );
    }

    return (
      <PcDesignStage>
        <main className="relative h-[1080px] w-[1920px] bg-[#4fc39b]">
          <div className="absolute left-[71px] top-[28px] flex items-center gap-[18px]">
            <Link to="/" aria-label="Bingo Networking 홈으로 이동" className="block">
              <img src={bingoNetworkingWordmark} alt="Bingo Networking" className="h-auto w-[236px]" />
            </Link>
            <DemoBadgeLink />
          </div>
          <KeywordSelector
            selectedKeywords={draftKeywords}
            onToggleKeyword={handleToggleKeyword}
            canStart={canStart}
            onStart={handleStart}
          />
          <p className="absolute left-0 top-[1018px] w-full text-center text-[18px] font-medium text-[#076945]/55">
            © 2023 DevFactory.
          </p>
        </main>
      </PcDesignStage>
    );
  }

  if (isMobileViewport) {
    return (
      <MobileDemoGame
        demoState={demoState}
        nextStep={nextStep}
        completedStepCount={completedStepCount}
        isComplete={isComplete}
        actionInputLabel={actionInputLabel}
        actionButtonLabel={actionButtonLabel}
        guidanceMode={guidanceMode}
        metParticipantCount={metParticipantCount}
        doneGivenCount={doneGivenCount}
        doneReceivedCount={doneReceivedCount}
        selectedKeywords={activeKeywords}
        boardSectionRef={mobileBoardSectionRef}
        onNext={handleNext}
        onReplay={handleReplay}
      />
    );
  }

  return (
    <PcDesignStage canvasHeight={PC_GAME_CANVAS_HEIGHT} scrollable>
      <main
        id="main-content"
        className="relative h-[1080px] w-[1920px] bg-[#4fc39b] text-slate-950"
      >
        <div className="absolute left-[71px] top-[28px] flex items-center gap-[18px]">
          <Link to="/" aria-label="Bingo Networking 홈으로 이동" className="block">
            <img src={bingoNetworkingWordmark} alt="Bingo Networking" className="h-auto w-[236px]" />
          </Link>
          <DemoBadgeLink />
        </div>
        <h1 className="sr-only">2명이 키워드를 교환하며 빙고를 채워요</h1>
        <DemoSendOverlay
          open={sendAlert.open}
          receiverName={sendAlert.receiverName}
          onClose={handleCloseSendAlert}
        />
        {guidanceMode ? <DemoGuidanceSpotlight mode={guidanceMode} /> : null}
        {shouldShowSendGuide ? <DemoGuidanceCallout /> : null}

        <section
          data-demo-game-layout="true"
          className="absolute left-1/2 top-[132px] grid w-[1535px] -translate-x-1/2 gap-[54px]"
          style={{ gridTemplateColumns: "806px 675px" }}
        >
          <div>
            <div className="grid gap-[26px]" style={{ gridTemplateColumns: "390px 390px" }}>
              <section className="relative h-[306px] overflow-hidden rounded-[22px] bg-white shadow-soft">
                <div className="relative z-10">
                  <p className="absolute left-[32px] top-[34px] text-[19px] font-black leading-none tracking-[-0.04em] text-[#071322]">
                  홍길동 님
                  </p>
                  <h2 className="absolute left-[32px] top-[104px] text-[39px] font-black leading-[45px] tracking-[-0.08em] text-[#076945]">
                  빙고를 채우며
                  <br />
                  소통해봐요!
                  </h2>
                </div>
                <img
                  src={characterIllustration}
                  alt=""
                  className="absolute left-[218px] top-[100px] h-auto w-[170px]"
                />
                {nextStep?.senderId === "guest" ? (
                  <div className="absolute left-[32px] top-[217px] z-10 flex h-[62px] w-[326px] items-center rounded-[31px] border-[1.5px] border-[#ddff57] bg-[#f5fbcc] p-[4px] shadow-[0_0_18px_rgba(221,255,87,0.25)]">
                    <div className="min-w-0 flex-1 px-[18px]">
                      <p className="text-[14px] font-black leading-none tracking-[-0.04em] text-[#00905b]">
                        {nextStep.senderName} 님이 보냈어요
                      </p>
                      <p className="mt-[6px] truncate text-[17px] font-black leading-none tracking-[-0.04em] text-[#076945]">
                        {nextStep.sentKeywords.join(", ")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      className={
                        shouldShowReceiveGuide
                          ? "relative z-30 h-[52px] w-[118px] rounded-[26px] !bg-[#ddff57] text-[17px] font-black tracking-[-0.04em] !text-[#076945] ring-[5px] ring-[#ddff57]/70 shadow-[0_0_0_10px_rgba(221,255,87,0.18)] hover:!bg-[#e8ff86] disabled:!bg-[#a7c4c8] disabled:!opacity-100"
                          : "h-[52px] w-[118px] rounded-[26px] !bg-[#ddff57] text-[17px] font-black tracking-[-0.04em] !text-[#076945] hover:!bg-[#e8ff86] disabled:!bg-[#a7c4c8] disabled:!opacity-100"
                      }
                      disabled={isComplete}
                      onClick={handleNext}
                    >
                      {actionButtonLabel}
                    </Button>
                  </div>
                ) : (
                  <div className="absolute left-[32px] top-[217px] z-10 flex h-[62px] w-[326px] rounded-[31px] border-[1.5px] border-[#076945] bg-white p-[4px]">
                    <p className="min-w-0 flex-1 px-[21px] py-[13px] text-[21px] font-black leading-none tracking-[-0.04em] text-slate-300">
                      {actionInputLabel}
                    </p>
                    <Button
                      type="button"
                      className={
                        shouldShowSendGuide
                          ? "h-[52px] w-[118px] rounded-[26px] !bg-[#4fc399] text-[19px] font-black tracking-[-0.04em] !text-white ring-[5px] ring-[#ddff57]/70 shadow-[0_0_0_10px_rgba(221,255,87,0.18)] hover:!bg-[#28d791] disabled:!bg-[#a7c4c8] disabled:!opacity-100"
                          : "h-[52px] w-[118px] rounded-[26px] !bg-[#4fc399] text-[19px] font-black tracking-[-0.04em] !text-white hover:!bg-[#28d791] disabled:!bg-[#a7c4c8] disabled:!opacity-100"
                      }
                      disabled={isComplete}
                      onClick={handleNext}
                    >
                      {actionButtonLabel}
                    </Button>
                  </div>
                )}
              </section>

              <section className="relative h-[306px] rounded-[22px] bg-white shadow-soft">
                <span className="absolute left-[32px] top-[31px] inline-flex h-[29px] items-center rounded-[15px] bg-[#00905b] px-[17px] text-[16px] font-black tracking-[-0.04em] text-white">
                  개인전
                </span>
                {completedStepCount > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute right-[23px] top-[24px] h-[42px] rounded-full border border-[#076945]/20 !bg-[#ddff57] px-[18px] text-[17px] font-black tracking-[-0.04em] !text-[#076945] shadow-[0_8px_18px_rgba(7,105,69,0.18)] hover:!bg-[#e8ff86] hover:!text-[#076945]"
                    onClick={handleReplay}
                  >
                    다시 체험하기
                  </Button>
                ) : null}
                <p className="absolute left-[32px] top-[99px] text-[60px] font-black leading-none tracking-[-0.08em] text-[#ff3b2f]">
                  {Math.min(100, Math.round((demoState.completedLines.length / DEMO_PLAY_GOAL_LINES) * 100))}%
                </p>
                <p className="absolute left-[32px] top-[174px] text-[24px] font-black leading-none tracking-[-0.06em] text-[#076945]">빙고 완성률</p>
                <div className="absolute left-[32px] top-[202px] h-[10px] w-[326px] overflow-hidden rounded-full border border-[#076945] bg-white">
                  <div
                    className="h-full rounded-full bg-[#00905b]"
                    style={{
                      width: `${Math.min(100, (demoState.completedLines.length / DEMO_PLAY_GOAL_LINES) * 100)}%`,
                    }}
                  />
                </div>
                <dl className="absolute left-[32px] top-[229px] grid w-[326px] gap-[15px] text-[18px] font-black leading-none tracking-[-0.04em] text-[#076945]">
                  <div className="flex justify-between">
                    <dt>수집한 키워드</dt>
                    <dd>{demoState.board.filter((cell) => cell.status === 1).length}/24</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>만난 참가자</dt>
                    <dd>{metParticipantCount}명</dd>
                  </div>
                </dl>
              </section>
            </div>

            <section className="mt-[28px] grid gap-[26px]" style={{ gridTemplateColumns: "390px 390px" }}>
              <div className="flex h-[430px] flex-col overflow-hidden rounded-[22px] bg-[#076945] px-[34px] py-[33px] shadow-soft">
                <h2 className="text-[23px] font-black tracking-[-0.04em] text-white">
                  내가 준 사람 <span className="text-[#ff5757]">{doneGivenCount}</span>
                </h2>
                <div
                  data-demo-history-list="given"
                  className="demo-play-history-list mt-[26px] flex min-h-0 flex-1 flex-col overflow-y-auto pr-[6px]"
                >
                  {completedGivenSteps.length > 0 ? (
                    completedGivenSteps.map(({ step, index }, displayIndex) => (
                      <ExchangeCard
                        key={step.id}
                        step={step}
                        index={displayIndex}
                        isActive={nextStep?.id === step.id}
                        isDone={index < completedStepCount}
                      />
                    ))
                  ) : (
                    <p className="pt-[4px] text-[18px] font-black leading-[27px] tracking-[-0.04em] text-white/55">
                      키워드를 보내면 기록이 여기에 쌓입니다.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex h-[430px] flex-col overflow-hidden rounded-[22px] bg-[#076945] px-[34px] py-[33px] shadow-soft">
                <h2 className="text-[23px] font-black tracking-[-0.04em] text-white">
                  나에게 보낸 사람 <span className="text-[#ff5757]">{doneReceivedCount}</span>
                </h2>
                <div
                  data-demo-history-list="received"
                  className="demo-play-history-list mt-[26px] flex min-h-0 flex-1 flex-col overflow-y-auto pr-[6px]"
                >
                  {completedReceivedSteps.length > 0 ? (
                    completedReceivedSteps.map(({ step, index }, displayIndex) => (
                      <ExchangeCard
                        key={step.id}
                        step={step}
                        index={displayIndex}
                        isActive={nextStep?.id === step.id}
                        isDone={index < completedStepCount}
                      />
                    ))
                  ) : (
                    <p className="pt-[4px] text-[18px] font-black leading-[27px] tracking-[-0.04em] text-white/55">
                      받은 키워드가 생기면 기록이 표시됩니다.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="pt-[25px]">
            <DemoBoard
              board={demoState.board}
              completedLines={demoState.completedLines}
              latestReceivedKeywords={demoState.latestReceivedKeywords}
              isGoalComplete={isComplete}
              showGoalOverlay={isGoalOverlayVisible}
              onDismissGoalOverlay={() => setIsGoalOverlayVisible(false)}
              receiveOverlay={receiveBoardAlert}
            />
          </div>
        </section>
        <p className="absolute left-0 top-[1018px] w-full text-center text-[18px] font-medium text-[#076945]/55">
          © 2023 DevFactory.
        </p>
      </main>
    </PcDesignStage>
  );
};

const DemoPlayPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isGameRoute = location.pathname.endsWith("/game");
  const selectedKeywordCount = (searchParams.get("keywords") ?? "")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .filter((keyword, index, list) => list.indexOf(keyword) === index)
    .slice(0, DEMO_PLAY_MAX_SELECTED_KEYWORDS).length;
  const route = isGameRoute ? "/demo/play/game" : "/demo/play";
  const demoRunRef = useRef({ locationKey: location.key, demoRunId: createAnalyticsId() });
  if (demoRunRef.current.locationKey !== location.key) {
    demoRunRef.current = { locationKey: location.key, demoRunId: createAnalyticsId() };
  }
  const demoRunId = demoRunRef.current.demoRunId;
  const isInvalidGameEntry = isGameRoute && selectedKeywordCount < DEMO_PLAY_MIN_SELECTED_KEYWORDS;
  const pageEventName =
    isInvalidGameEntry
      ? "demo_invalid_game_entry_redirected"
      : isGameRoute
        ? "demo_game_viewed"
        : "demo_keyword_selection_viewed";
  const pageProperties = isInvalidGameEntry
    ? {
        reason: selectedKeywordCount === 0 ? "missing_keywords" : "insufficient_keywords",
        keyword_count: selectedKeywordCount,
      }
    : isGameRoute
    ? {
        demo_run_id: demoRunId,
        selected_count: selectedKeywordCount,
      }
    : {
        preselected_count: selectedKeywordCount,
        source_route: "direct_or_previous",
      };

  return (
    <SiteAnalyticsScope
      route={route}
      pageEventName={pageEventName}
      pageProperties={pageProperties}
    >
      <DemoPlayPageContent demoRunId={demoRunId} />
    </SiteAnalyticsScope>
  );
};

export default DemoPlayPage;
