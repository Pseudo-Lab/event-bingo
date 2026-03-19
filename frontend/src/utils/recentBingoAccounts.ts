export type RecentBingoAccount = {
  userName: string;
  loginId: string;
  lastUsedAt: string;
};

type StoredRecentBingoAccount = RecentBingoAccount & {
  userId?: string;
};

const STORAGE_KEY = "bingo.recentAccounts.v1";
const MAX_RECENT_ACCOUNTS = 5;
const RECENT_ACCOUNT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const hasWindow = () => typeof window !== "undefined";

const normalizeAccount = (account: StoredRecentBingoAccount): RecentBingoAccount => ({
  userName: account.userName.trim(),
  loginId: account.loginId.trim().toUpperCase(),
  lastUsedAt: account.lastUsedAt,
});

const writeRecentBingoAccounts = (accounts: RecentBingoAccount[]) => {
  if (!hasWindow()) {
    return;
  }

  if (accounts.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
};

const isRetainedAccount = (account: RecentBingoAccount, now: number) => {
  const lastUsedAt = new Date(account.lastUsedAt).getTime();

  if (Number.isNaN(lastUsedAt)) {
    return false;
  }

  return now - lastUsedAt <= RECENT_ACCOUNT_RETENTION_MS;
};

export const getRecentBingoAccounts = (): RecentBingoAccount[] => {
  if (!hasWindow()) {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StoredRecentBingoAccount[];
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    const nextAccounts = parsed
      .filter((account) => {
        return typeof account?.userName === "string" &&
          typeof account?.loginId === "string" &&
          typeof account?.lastUsedAt === "string";
      })
      .map(normalizeAccount)
      .filter((account) => isRetainedAccount(account, Date.now()))
      .sort(
        (left, right) =>
          new Date(right.lastUsedAt).getTime() - new Date(left.lastUsedAt).getTime()
      )
      .slice(0, MAX_RECENT_ACCOUNTS);

    if (JSON.stringify(nextAccounts) !== raw) {
      writeRecentBingoAccounts(nextAccounts);
    }

    return nextAccounts;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
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

  writeRecentBingoAccounts([nextAccount, ...deduped].slice(0, MAX_RECENT_ACCOUNTS));
};
