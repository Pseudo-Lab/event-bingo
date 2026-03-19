import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { getAdminPath } from "../../config/eventProfiles";
import type { BingoCell } from "../Bingo/bingoGameTypes";
import { getCompletedLines, shuffleArray } from "../Bingo/bingoGameUtils";

type DemoVisitor = {
  id: number;
  name: string;
  role: string;
  keywords: string[];
};

type DemoEncounter = {
  id: string;
  visitorName: string;
  visitorRole: string;
  appliedKeywords: string[];
  createdAt: string;
};

const DEMO_KEYWORDS = [
  "AI",
  "디자인",
  "프로덕트",
  "브랜딩",
  "창업",
  "커뮤니티",
  "채용",
  "데이터",
  "교육",
  "운영",
  "마케팅",
  "콘텐츠",
  "기획",
  "협업",
  "네트워킹",
  "UX",
  "리서치",
  "개발",
  "투자",
  "파트너십",
  "브랜드",
  "세일즈",
  "리더십",
  "운영전략",
  "커리어",
] as const;

const DEMO_VISITOR_NAMES = [
  ["김민지", "프로덕트 디자이너"],
  ["박준호", "커뮤니티 리드"],
  ["이서윤", "스타트업 대표"],
  ["정하람", "데이터 분석가"],
  ["최도윤", "브랜드 마케터"],
  ["윤가영", "교육 기획자"],
  ["한지후", "개발 리드"],
  ["오세아", "파트너십 매니저"],
] as const;

const DEMO_GOAL_LINES = 3;
const DEMO_VISITOR_INDEX_GROUPS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [9, 10, 11],
  [12, 13, 14],
  [15, 16, 17],
  [18, 19, 20],
  [21, 22, 23],
] as const;
const DEMO_STEPS = [
  {
    title: "키워드 고르기",
    description: "관심 키워드를 3개 이상 고르고 데모를 시작합니다.",
    className: "bg-[#eef8f2] text-brand-900",
  },
  {
    title: "랜덤 참가자 만나기",
    description: "한 번 만날 때마다 상대가 가진 3개 키워드가 보드에 반영됩니다.",
    className: "bg-[#f3f7ff] text-slate-900",
  },
  {
    title: "빙고 변화 보기",
    description: "줄이 완성되는 흐름과 만남 기록을 한 화면에서 빠르게 확인합니다.",
    className: "bg-[#fff7ea] text-slate-900",
  },
] as const;

const createDemoBoard = (selectedKeywords: string[]) => {
  const uniqueSelectedKeywords = [...new Set(selectedKeywords)];
  const remainingKeywords = shuffleArray(
    DEMO_KEYWORDS.filter((keyword) => !uniqueSelectedKeywords.includes(keyword))
  );
  const pool = [...uniqueSelectedKeywords, ...remainingKeywords].slice(0, 25);

  return pool.map<BingoCell>((value, index) => ({
    id: index,
    value,
    selected: 0,
    status: 0,
  }));
};

const createDemoVisitors = (board: BingoCell[]): DemoVisitor[] => {
  const boardWords = board.map((cell) => cell.value);

  return DEMO_VISITOR_NAMES.map(([name, role], index) => {
    const keywordIndexes = DEMO_VISITOR_INDEX_GROUPS[index] ?? [0, 1, 2];
    const keywords = keywordIndexes.map((keywordIndex) => boardWords[keywordIndex]).filter(Boolean);

    return {
      id: index + 1,
      name,
      role,
      keywords,
    };
  });
};

const formatEncounterTime = (value: string) => {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
};

const DemoExperiencePage = () => {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [board, setBoard] = useState<BingoCell[]>([]);
  const [visitors, setVisitors] = useState<DemoVisitor[]>([]);
  const [history, setHistory] = useState<DemoEncounter[]>([]);
  const [currentEncounter, setCurrentEncounter] = useState<DemoEncounter | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const isStarted = board.length > 0;
  const completedLines = useMemo(
    () => (board.length === 25 ? getCompletedLines(board, 5) : []),
    [board]
  );
  const bingoCount = completedLines.length;
  const metCount = history.length;

  const handleToggleKeyword = (keyword: string) => {
    if (isStarted) {
      return;
    }

    setErrorMessage("");
    setSelectedKeywords((previousValue) => {
      if (previousValue.includes(keyword)) {
        return previousValue.filter((item) => item !== keyword);
      }

      if (previousValue.length >= 5) {
        return previousValue;
      }

      return [...previousValue, keyword];
    });
  };

  const handleStartDemo = () => {
    if (selectedKeywords.length < 3) {
      setErrorMessage("키워드를 3개 이상 선택해 주세요.");
      return;
    }

    const nextBoard = createDemoBoard(selectedKeywords);
    setBoard(nextBoard);
    setVisitors(createDemoVisitors(nextBoard));
    setHistory([]);
    setCurrentEncounter(null);
    setErrorMessage("");
  };

  const handleResetDemo = () => {
    setBoard([]);
    setVisitors([]);
    setHistory([]);
    setCurrentEncounter(null);
    setErrorMessage("");
  };

  const handleMeetRandomVisitor = () => {
    if (!isStarted) {
      return;
    }

    const candidates = visitors
      .map((visitor) => {
        const pendingKeywords = visitor.keywords.filter((keyword) =>
          board.some((cell) => cell.value === keyword && cell.status === 0)
        );

        return {
          visitor,
          pendingKeywords,
        };
      })
      .filter((item) => item.pendingKeywords.length > 0);

    if (candidates.length === 0) {
      setErrorMessage("데모에서 반영할 수 있는 키워드를 모두 경험했습니다. 다시 시작해 보세요.");
      return;
    }

    const nextCandidate =
      candidates[Math.floor(Math.random() * candidates.length)];
    const appliedKeywords = nextCandidate.pendingKeywords.slice(0, 3);
    const createdAt = new Date().toISOString();

    setBoard((previousValue) =>
      previousValue.map((cell) =>
        appliedKeywords.includes(cell.value)
          ? {
              ...cell,
              selected: 1,
              status: 1,
            }
          : cell
      )
    );

    const encounter: DemoEncounter = {
      id: `${nextCandidate.visitor.id}-${createdAt}`,
      visitorName: nextCandidate.visitor.name,
      visitorRole: nextCandidate.visitor.role,
      appliedKeywords,
      createdAt,
    };

    setCurrentEncounter(encounter);
    setHistory((previousValue) => [encounter, ...previousValue]);
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-[#f3f8f4] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(29,172,121,0.18),transparent_22%),radial-gradient(circle_at_88%_12%,rgba(14,88,63,0.14),transparent_18%),linear-gradient(180deg,#f3f8f4_0%,#e8f1ed_100%)]"
      />

      <main className="relative mx-auto flex max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-5 rounded-[2rem] border border-white/70 bg-white/80 px-7 py-6 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-700">
              Demo Experience
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
              로그인 없이 빙고 흐름을 빠르게 체험해 보세요
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              키워드를 고르고, 랜덤 참가자를 만나며, 빙고판이 어떻게 바뀌는지 바로 확인할 수
              있습니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-brand-700 bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              홈으로
            </Link>
            <Link
              to={getAdminPath()}
              className="inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              관리자 로그인
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {DEMO_STEPS.map((step, index) => (
            <div
              key={step.title}
              className={`rounded-[1.6rem] border border-white/70 px-6 py-5 shadow-soft ${step.className}`}
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70">
                Step {index + 1}
              </p>
              <h2 className="mt-3 text-xl font-black tracking-[-0.04em]">
                {step.title}
              </h2>
              <p className="mt-3 text-sm leading-7 opacity-80">
                {step.description}
              </p>
            </div>
          ))}
        </section>

        {!isStarted ? (
          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="rounded-[2rem] border-white/70 bg-white/85 shadow-soft">
              <CardContent className="space-y-6 p-7 sm:p-9">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-[-0.05em] text-slate-950">
                    관심 키워드를 3개 이상 고르세요
                  </h2>
                  <p className="text-sm leading-7 text-slate-600">
                    실제 서비스에서는 참가자가 로그인 후 키워드를 선택하고 게임에 들어갑니다.
                    여기서는 그 흐름을 바로 체험할 수 있게 축약했습니다.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {DEMO_KEYWORDS.map((keyword) => {
                    const isActive = selectedKeywords.includes(keyword);
                    return (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => handleToggleKeyword(keyword)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                          isActive
                            ? "bg-brand-700 text-white"
                            : "bg-white text-slate-600 shadow-sm hover:bg-brand-50 hover:text-brand-700"
                        }`}
                      >
                        {keyword}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-[1.5rem] bg-[#f6f9f5] px-5 py-5">
                  <p className="text-sm font-semibold text-slate-500">
                    선택된 키워드 {selectedKeywords.length}개 / 최소 3개
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedKeywords.length > 0 ? (
                      selectedKeywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full bg-brand-100 px-3 py-1.5 text-sm font-semibold text-brand-800"
                        >
                          {keyword}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">아직 선택한 키워드가 없습니다.</span>
                    )}
                  </div>
                </div>

                {errorMessage ? (
                  <p className="text-sm font-semibold text-rose-600">{errorMessage}</p>
                ) : null}

                <Button onClick={handleStartDemo} className="rounded-full px-6">
                  데모 빙고 시작
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-[#d8eee3] bg-[#eaf7f1] shadow-soft">
              <CardContent className="space-y-6 p-7 sm:p-9">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-[-0.05em] text-slate-950">
                    랜덤 참가자와 만나면 키워드가 보드에 반영됩니다
                  </h2>
                  <p className="text-sm leading-7 text-slate-600">
                    데모에서는 한 번 만날 때마다 상대가 가진 3개 키워드가 보드에 반영됩니다.
                  </p>
                </div>

                <div className="mx-auto w-full max-w-[31rem]">
                  <div className="grid grid-cols-5 gap-2.5 rounded-[1.8rem] bg-white p-4 shadow-sm sm:gap-3">
                    {DEMO_KEYWORDS.slice(0, 25).map((keyword, index) => (
                    <div
                      key={`${keyword}-${index}`}
                      className={`flex aspect-square items-center justify-center rounded-[1rem] border px-2 text-center text-[0.72rem] font-bold leading-4 sm:text-xs sm:leading-5 ${
                        index % 6 === 0
                          ? "border-brand-200 bg-brand-100 text-brand-800"
                          : "border-slate-100 bg-[#fbfcf8] text-slate-600"
                      }`}
                    >
                      {keyword}
                    </div>
                  ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[21rem_minmax(0,1fr)] xl:items-stretch">
            <div className="flex min-h-0 flex-col gap-6 xl:h-[54rem]">
              <Card className="rounded-[2rem] border-white/70 bg-white/85 shadow-soft">
                <CardContent className="space-y-4 p-6 pt-7">
                  <div className="space-y-2">
                    <p className="pt-0.5 text-sm font-bold uppercase tracking-[0.22em] text-brand-700">
                      Demo Status
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    {[
                      { label: "만난 사람", value: `${metCount}명` },
                      {
                        label: "완성 줄 수 / 목표",
                        value: `${bingoCount}줄 / ${DEMO_GOAL_LINES}줄`,
                      },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-[1.35rem] bg-[#f6f9f5] px-4 py-3.5">
                        <p className="text-[0.92rem] font-semibold text-slate-500">{metric.label}</p>
                        <p className="mt-1.5 text-[1.65rem] font-black tracking-[-0.04em] text-slate-950">
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[1.45rem] bg-brand-50 px-4 py-4">
                    <p className="text-[0.92rem] font-semibold text-brand-700">선택한 키워드</p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {selectedKeywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full bg-white px-3 py-1.5 text-[0.92rem] font-semibold text-brand-800"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  {currentEncounter ? (
                    <div className="rounded-[1.45rem] bg-brand-900 px-4 py-4 text-white">
                      <p className="text-[0.92rem] font-semibold text-white/70">
                        방금 만난 참가자
                      </p>
                      <p className="mt-1 text-[1.08rem] font-black tracking-[-0.04em]">
                        {currentEncounter.visitorName} · {currentEncounter.visitorRole}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {currentEncounter.appliedKeywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="rounded-full bg-white/15 px-3 py-1.5 text-[0.88rem] font-semibold text-white"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {errorMessage ? (
                    <p className="text-sm font-semibold text-rose-600">{errorMessage}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleMeetRandomVisitor} className="rounded-full px-6">
                      랜덤 유저 만나기
                    </Button>
                    <Button onClick={handleResetDemo} variant="outline" className="rounded-full px-6">
                      다시 시작
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex min-h-0 flex-1 overflow-hidden rounded-[2rem] border-white/70 bg-white/85 shadow-soft">
                <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-6 pt-7">
                  <h3 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                    만남 기록
                  </h3>
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-3 [scrollbar-gutter:stable_both-edges]">
                    {history.length > 0 ? (
                      history.map((encounter) => (
                        <div
                          key={encounter.id}
                          className="rounded-[1.4rem] border border-slate-100 bg-[#fbfcf8] px-4 py-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-base font-black text-slate-900">
                                {encounter.visitorName}
                              </p>
                              <p className="text-sm text-slate-500">{encounter.visitorRole}</p>
                            </div>
                            <p className="text-sm font-semibold text-slate-400">
                              {formatEncounterTime(encounter.createdAt)}
                            </p>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {encounter.appliedKeywords.map((keyword) => (
                              <span
                                key={`${encounter.id}-${keyword}`}
                                className="rounded-full bg-brand-100 px-3 py-1.5 text-sm font-semibold text-brand-800"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.4rem] bg-[#f6f9f5] px-4 py-6 text-center text-sm font-semibold text-slate-400">
                        아직 만남 기록이 없습니다.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="flex overflow-hidden rounded-[2rem] border-[#d8eee3] bg-white shadow-soft xl:h-[54rem]">
              <CardContent className="flex min-h-0 flex-1 flex-col gap-5 p-6 pt-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="pt-0.5 text-sm font-bold uppercase tracking-[0.22em] text-brand-700">
                      Demo Board
                    </p>
                    <h2 className="text-[1.55rem] font-black tracking-[-0.05em] text-slate-950">
                      보드가 채워지는 흐름을 관찰해 보세요
                    </h2>
                  </div>
                  <div className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800">
                    목표 {DEMO_GOAL_LINES}줄 · 현재 {bingoCount}줄
                  </div>
                </div>

                <div className="mx-auto w-full max-w-[33rem] shrink-0">
                  <div className="grid grid-cols-5 gap-2.5 rounded-[1.8rem] bg-[#f3f8f4] p-4 sm:gap-3">
                    {board.map((cell) => (
                      <div
                        key={cell.id}
                        className={`flex aspect-square items-center justify-center rounded-[1rem] border px-2 text-center text-[0.72rem] font-bold leading-4 transition-colors sm:text-[0.82rem] sm:leading-5 ${
                          cell.status === 1
                            ? "border-brand-300 bg-brand-100 text-brand-900"
                            : "border-white bg-white text-slate-600"
                        }`}
                      >
                        {cell.value}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
                  <div className="h-full min-h-0 rounded-[1.5rem] bg-[#f6f9f5] px-5 py-5">
                    <p className="text-sm font-semibold text-slate-500">완성된 라인</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {completedLines.length > 0 ? (
                        completedLines.map((line) => (
                          <span
                            key={`${line.type}-${line.index}`}
                            className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-brand-800"
                          >
                            {line.type === "row"
                              ? `${line.index + 1}행`
                              : line.type === "col"
                                ? `${line.index + 1}열`
                                : line.index === 1
                                  ? "대각선 ↘"
                                  : "대각선 ↙"}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-400">아직 완성된 라인이 없습니다.</span>
                      )}
                    </div>
                  </div>

                  <div className="h-full rounded-[1.5rem] bg-brand-900 px-5 py-5 text-white">
                    <p className="text-sm font-semibold text-white/70">다음 액션</p>
                    <p className="mt-2 text-lg font-black tracking-[-0.04em]">
                      더 많은 사람을 만나며 같은 키워드를 받을수록 보드가 채워집니다.
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/75">
                      실제 행사에서는 참가자가 로그인한 뒤 같은 흐름으로 빙고를 이어가게 됩니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
};

export default DemoExperiencePage;
