export type RecentBingoAccount = {
  userId: string;
  userName: string;
  loginId: string;
  lastUsedAt: string;
};

const STORAGE_KEY = "bingo.recentAccounts.v1";
const MAX_RECENT_ACCOUNTS = 5;

const hasWindow = () => typeof window !== "undefined";

const normalizeAccount = (account: RecentBingoAccount): RecentBingoAccount => ({
  userId: account.userId,
  userName: account.userName.trim(),
  loginId: account.loginId.trim().toUpperCase(),
  lastUsedAt: account.lastUsedAt,
});

export const getRecentBingoAccounts = (): RecentBingoAccount[] => {
  if (!hasWindow()) {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as RecentBingoAccount[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((account) => {
        return typeof account?.userId === "string" &&
          typeof account?.userName === "string" &&
          typeof account?.loginId === "string" &&
          typeof account?.lastUsedAt === "string";
      })
      .map(normalizeAccount)
      .sort(
        (left, right) =>
          new Date(right.lastUsedAt).getTime() - new Date(left.lastUsedAt).getTime()
      );
  } catch {
    return [];
  }
};

export const saveRecentBingoAccount = (account: Omit<RecentBingoAccount, "lastUsedAt">) => {
  if (!hasWindow()) {
    return;
  }

  const nextAccount = normalizeAccount({
    ...account,
    lastUsedAt: new Date().toISOString(),
  });

  const deduped = getRecentBingoAccounts().filter(
    (recentAccount) => recentAccount.loginId !== nextAccount.loginId
  );

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([nextAccount, ...deduped].slice(0, MAX_RECENT_ACCOUNTS))
  );
};
