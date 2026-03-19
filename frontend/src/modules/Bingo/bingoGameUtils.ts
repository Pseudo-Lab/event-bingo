import type {
  AlertSeverity,
  BingoCell,
  BoardPreviewPreset,
  BoardLineCoordinates,
  CompletedLine,
  ExchangeRecord,
  InteractionRecord,
} from "./bingoGameTypes";

export const shuffleArray = (array: string[]) => {
  return [...array].sort(() => Math.random() - 0.5);
};

export const formatHistoryDate = (value: string) => {
  return value.replace(/-/g, ".").replace("T", " ").slice(0, 16);
};

export const getUniqueKeywords = (keywords: string[]) => [
  ...new Set(keywords.filter(Boolean)),
];

export const serializeInteractionKeywords = (keywords: string[]) =>
  JSON.stringify(getUniqueKeywords(keywords));

export const parseInteractionKeywords = (payload: string[] | string) => {
  if (Array.isArray(payload)) {
    return getUniqueKeywords(payload);
  }

  const normalizedPayload = payload.trim();
  if (!normalizedPayload) {
    return [];
  }

  if (normalizedPayload.startsWith("[")) {
    try {
      const parsedPayload = JSON.parse(normalizedPayload) as unknown;
      if (Array.isArray(parsedPayload)) {
        return getUniqueKeywords(
          parsedPayload.filter(
            (item): item is string =>
              typeof item === "string" && item.trim().length > 0
          )
        );
      }
    } catch (error) {
      console.warn("Failed to parse interaction keyword payload:", error);
    }
  }

  return [normalizedPayload];
};

export const getInteractionKeywords = (record: InteractionRecord) =>
  parseInteractionKeywords(record.word_id_list);

export const getPendingKeywordsForBoard = (
  board: BingoCell[],
  sourceKeywords: string[]
) => {
  const sourceKeywordSet = new Set(sourceKeywords);

  return getUniqueKeywords(
    board
      .filter((cell) => sourceKeywordSet.has(cell.value) && cell.status !== 1)
      .map((cell) => cell.value)
  );
};

export const getLatestIncomingBatch = (interactions: InteractionRecord[]) => {
  if (!Array.isArray(interactions) || interactions.length === 0) {
    return null;
  }

  const sortedInteractions = [...interactions].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
  const latestInteraction = sortedInteractions[0];
  const latestTimestamp = new Date(latestInteraction.created_at).getTime();
  const batchInteractions = sortedInteractions.filter((interaction) => {
    return (
      interaction.send_user_id === latestInteraction.send_user_id &&
      latestTimestamp - new Date(interaction.created_at).getTime() <= 1500
    );
  });

  const keywords = getUniqueKeywords(
    batchInteractions.flatMap((interaction) => getInteractionKeywords(interaction))
  );

  return {
    senderId: String(latestInteraction.send_user_id),
    senderName: latestInteraction.send_user_name,
    createdAt: latestInteraction.created_at,
    keywords,
    signature: `${latestInteraction.send_user_id}:${latestInteraction.created_at}:${keywords.join("|")}`,
  };
};

export const getDefaultAlertTitle = (severity: AlertSeverity) => {
  if (severity === "success") {
    return "완료되었어요";
  }

  if (severity === "warning") {
    return "확인해 주세요";
  }

  if (severity === "error") {
    return "문제가 발생했어요";
  }

  return "안내";
};

export const createBoardConnectionLines = (boardSize: number) => {
  const boardCenters = Array.from(
    { length: boardSize },
    (_, index) => ((index + 0.5) * 100) / boardSize
  );
  const lines: BoardLineCoordinates[] = [];

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize - 1; col += 1) {
      lines.push({
        x1: boardCenters[col],
        y1: boardCenters[row],
        x2: boardCenters[col + 1],
        y2: boardCenters[row],
      });
      lines.push({
        x1: boardCenters[row],
        y1: boardCenters[col],
        x2: boardCenters[row],
        y2: boardCenters[col + 1],
      });
    }
  }

  for (let index = 0; index < boardSize - 1; index += 1) {
    lines.push({
      x1: boardCenters[index],
      y1: boardCenters[index],
      x2: boardCenters[index + 1],
      y2: boardCenters[index + 1],
    });
    lines.push({
      x1: boardCenters[boardSize - 1 - index],
      y1: boardCenters[index],
      x2: boardCenters[boardSize - 2 - index],
      y2: boardCenters[index + 1],
    });
  }

  return lines;
};

export const getLineCoordinates = (
  line: CompletedLine,
  boardSize: number
): BoardLineCoordinates => {
  const boardCenters = Array.from(
    { length: boardSize },
    (_, index) => ((index + 0.5) * 100) / boardSize
  );
  const boardEdgeStart = boardCenters[0] ?? 0;
  const boardEdgeEnd = boardCenters[boardCenters.length - 1] ?? 100;

  if (line.type === "row") {
    const y = boardCenters[line.index];
    return { x1: boardEdgeStart, y1: y, x2: boardEdgeEnd, y2: y };
  }

  if (line.type === "col") {
    const x = boardCenters[line.index];
    return { x1: x, y1: boardEdgeStart, x2: x, y2: boardEdgeEnd };
  }

  if (line.type === "diagonal" && line.index === 1) {
    return {
      x1: boardEdgeStart,
      y1: boardEdgeStart,
      x2: boardEdgeEnd,
      y2: boardEdgeEnd,
    };
  }

  return {
    x1: boardEdgeEnd,
    y1: boardEdgeStart,
    x2: boardEdgeStart,
    y2: boardEdgeEnd,
  };
};

export const getCellsInLine = (
  type: string,
  index: number,
  boardSize: number
) => {
  const cells: number[] = [];

  if (type === "row") {
    for (let col = 0; col < boardSize; col += 1) {
      cells.push(index * boardSize + col);
    }
  } else if (type === "col") {
    for (let row = 0; row < boardSize; row += 1) {
      cells.push(row * boardSize + index);
    }
  } else if (type === "diagonal" && index === 1) {
    for (let diagonal = 0; diagonal < boardSize; diagonal += 1) {
      cells.push(diagonal * boardSize + diagonal);
    }
  } else if (type === "diagonal" && index === 2) {
    for (let diagonal = 0; diagonal < boardSize; diagonal += 1) {
      cells.push(diagonal * boardSize + (boardSize - 1 - diagonal));
    }
  }

  return cells;
};

export const getCompletedLines = (
  board: BingoCell[],
  boardSize: number
): CompletedLine[] => {
  const newCompletedLines: CompletedLine[] = [];

  for (let row = 0; row < boardSize; row += 1) {
    let rowComplete = true;
    for (let col = 0; col < boardSize; col += 1) {
      if (!board[row * boardSize + col].status) {
        rowComplete = false;
        break;
      }
    }

    if (rowComplete) {
      newCompletedLines.push({ type: "row", index: row });
    }
  }

  for (let col = 0; col < boardSize; col += 1) {
    let colComplete = true;
    for (let row = 0; row < boardSize; row += 1) {
      if (!board[row * boardSize + col].status) {
        colComplete = false;
        break;
      }
    }

    if (colComplete) {
      newCompletedLines.push({ type: "col", index: col });
    }
  }

  let diagonal1Complete = true;
  for (let index = 0; index < boardSize; index += 1) {
    if (!board[index * boardSize + index].status) {
      diagonal1Complete = false;
      break;
    }
  }

  if (diagonal1Complete) {
    newCompletedLines.push({ type: "diagonal", index: 1 });
  }

  let diagonal2Complete = true;
  for (let index = 0; index < boardSize; index += 1) {
    if (!board[index * boardSize + (boardSize - 1 - index)].status) {
      diagonal2Complete = false;
      break;
    }
  }

  if (diagonal2Complete) {
    newCompletedLines.push({ type: "diagonal", index: 2 });
  }

  return newCompletedLines;
};

export const BOARD_PREVIEW_OPTIONS: Array<{
  id: BoardPreviewPreset;
  label: string;
}> = [
  { id: "one-line", label: "1줄 완성" },
  { id: "two-lines", label: "2줄 완성" },
  { id: "three-lines", label: "3줄 완성" },
  { id: "full", label: "올클리어" },
];

export const buildPreviewBoard = (
  sourceBoard: BingoCell[],
  preset: BoardPreviewPreset,
  boardSize: number
) => {
  if (preset === "full") {
    return sourceBoard.map((cell) => ({
      ...cell,
      status: 1,
    }));
  }

  const presetLines: CompletedLine[] = [
    { type: "row", index: 0 },
    { type: "col", index: 0 },
    { type: "diagonal", index: 1 },
  ];
  const lineCountByPreset: Record<Exclude<BoardPreviewPreset, "full">, number> = {
    "one-line": 1,
    "two-lines": 2,
    "three-lines": 3,
  };
  const activeCellIds = new Set<number>();

  presetLines
    .slice(0, lineCountByPreset[preset])
    .forEach((line) => {
      getCellsInLine(line.type, line.index, boardSize).forEach((cellId) => {
        activeCellIds.add(cellId);
      });
    });

  return sourceBoard.map((cell, index) => ({
    ...cell,
    status: activeCellIds.has(index) ? 1 : 0,
  }));
};

export const buildExchangeHistory = (
  interactions: InteractionRecord[],
  activeUserId: string
) => {
  const activeNumericUserId = Number(activeUserId);
  const counterpartUserIds = new Set<number>();
  const grouped: Record<string, ExchangeRecord> = {};

  for (const record of interactions) {
    if (record.send_user_id === activeNumericUserId) {
      counterpartUserIds.add(record.receive_user_id);
    }

    if (record.receive_user_id === activeNumericUserId) {
      counterpartUserIds.add(record.send_user_id);
    }

    const groupKey = `${record.send_user_id}-${record.receive_user_id}`;

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        id: groupKey,
        createdAt: record.created_at,
        date: formatHistoryDate(record.created_at),
        sendUserId: record.send_user_id,
        receiveUserId: record.receive_user_id,
        sendPerson: record.send_user_name || `참가자 ${record.send_user_id}`,
        receivePerson: record.receive_user_name || `참가자 ${record.receive_user_id}`,
        given: [],
      };
    }

    grouped[groupKey].given = getUniqueKeywords([
      ...grouped[groupKey].given,
      ...getInteractionKeywords(record),
    ]);

    if (
      new Date(record.created_at).getTime() >
      new Date(grouped[groupKey].createdAt).getTime()
    ) {
      grouped[groupKey].createdAt = record.created_at;
      grouped[groupKey].date = formatHistoryDate(record.created_at);
    }
  }

  return {
    records: Object.values(grouped).sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    ),
    metPersonCount: counterpartUserIds.size,
  };
};

const getInteractionIdentity = (record: InteractionRecord) => {
  if (typeof record.interaction_id === "number") {
    return `id:${record.interaction_id}`;
  }

  return [
    record.send_user_id,
    record.receive_user_id,
    record.created_at,
    typeof record.word_id_list === "string"
      ? record.word_id_list
      : JSON.stringify(record.word_id_list),
  ].join(":");
};

export const mergeInteractionRecords = (
  currentRecords: InteractionRecord[],
  incomingRecords: InteractionRecord[]
) => {
  const mergedRecords = new Map<string, InteractionRecord>();

  [...currentRecords, ...incomingRecords].forEach((record) => {
    mergedRecords.set(getInteractionIdentity(record), record);
  });

  return [...mergedRecords.values()].sort((left, right) => {
    const timeDiff =
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return (right.interaction_id ?? 0) - (left.interaction_id ?? 0);
  });
};

export const getLatestInteractionId = (records: InteractionRecord[]) => {
  return records.reduce((maxId, record) => {
    return Math.max(maxId, record.interaction_id ?? 0);
  }, 0);
};
