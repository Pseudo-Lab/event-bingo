type StorageReader = Pick<Storage, "getItem"> | null | undefined;
type StorageWriter = Pick<Storage, "setItem"> | null | undefined;

export const getGoalCelebrationStorageKey = (eventSlug: string, userId: string) =>
  `event-bingo.goal-celebration.v1:${eventSlug}:${userId}`;

export const readGoalCelebrationFlag = (
  storage: StorageReader,
  eventSlug?: string,
  userId?: string
) => {
  if (!storage || !eventSlug || !userId) {
    return false;
  }

  return storage.getItem(getGoalCelebrationStorageKey(eventSlug, userId)) === "1";
};

export const writeGoalCelebrationFlag = (
  storage: StorageWriter,
  eventSlug?: string,
  userId?: string
) => {
  if (!storage || !eventSlug || !userId) {
    return;
  }

  storage.setItem(getGoalCelebrationStorageKey(eventSlug, userId), "1");
};
