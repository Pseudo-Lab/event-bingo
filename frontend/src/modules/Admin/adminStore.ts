import type {
  AdminMember,
  AdminRole,
  AdminSession,
  StoredAdminMember,
} from "./adminTypes";

const STORAGE_KEY = "event-bingo.admin-members.v1";
const DEFAULT_PASSWORD = "Admin1234!";
const DEFAULT_PHONE = "010-0000-0000";

const hasWindow = () => typeof window !== "undefined";

const sortMembers = (members: StoredAdminMember[]) => {
  return [...members].sort((left, right) => right.id - left.id);
};

const createSeedMembers = (): StoredAdminMember[] => {
  return [
    {
      id: 1,
      name: "김철수",
      email: "manager@laivdata.com",
      phone: DEFAULT_PHONE,
      createdAt: "2024-05-17T00:00:00+09:00",
      role: "event_manager",
      password: DEFAULT_PASSWORD,
    },
    {
      id: 2,
      name: "이준호",
      email: "ops@laivdata.com",
      phone: DEFAULT_PHONE,
      createdAt: "2024-05-17T00:00:00+09:00",
      role: "admin",
      password: DEFAULT_PASSWORD,
    },
    {
      id: 3,
      name: "박민지",
      email: "admin@laivdata.com",
      phone: DEFAULT_PHONE,
      createdAt: "2024-05-17T00:00:00+09:00",
      role: "admin",
      password: DEFAULT_PASSWORD,
    },
    {
      id: 4,
      name: "김길동",
      email: "uni@laivdata.com",
      phone: DEFAULT_PHONE,
      createdAt: "2024-05-17T00:00:00+09:00",
      role: "admin",
      password: DEFAULT_PASSWORD,
    },
  ];
};

const readMembers = (): StoredAdminMember[] => {
  if (!hasWindow()) {
    return createSeedMembers();
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return createSeedMembers();
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsedValue)
      ? sortMembers(parsedValue as StoredAdminMember[])
      : createSeedMembers();
  } catch (error) {
    console.warn("Failed to parse admin member store. Resetting it.", error);
    window.localStorage.removeItem(STORAGE_KEY);
    return createSeedMembers();
  }
};

const writeMembers = (members: StoredAdminMember[]) => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
};

const getOrCreateStoredMembers = () => {
  const members = sortMembers(readMembers());
  writeMembers(members);
  return members;
};

const stripPasswords = (members: StoredAdminMember[]): AdminMember[] => {
  return members.map((member) => ({
    id: member.id,
    email: member.email,
    name: member.name,
    phone: member.phone,
    createdAt: member.createdAt,
    role: member.role,
  }));
};

const getNextMemberId = (members: StoredAdminMember[]) => {
  return members.reduce((maxId, member) => Math.max(maxId, member.id), 0) + 1;
};

export const listAdminMembers = () => stripPasswords(getOrCreateStoredMembers());

export const authenticateAdmin = (email: string, password: string): AdminSession | null => {
  const normalizedEmail = email.trim().toLowerCase();
  const targetMember = getOrCreateStoredMembers().find((member) => {
    return member.email.toLowerCase() === normalizedEmail && member.password === password;
  });

  if (!targetMember) {
    return null;
  }

  return {
    id: targetMember.id,
    email: targetMember.email,
    name: targetMember.name,
    role: targetMember.role,
    accessToken: "",
  };
};

export const addAdminMember = (input: {
  email: string;
  password: string;
  name: string;
  role: AdminRole;
}) => {
  const members = getOrCreateStoredMembers();
  const normalizedEmail = input.email.trim().toLowerCase();

  if (members.some((member) => member.email.toLowerCase() === normalizedEmail)) {
    throw new Error("이미 등록된 관리자 계정입니다.");
  }

  const nextMember: StoredAdminMember = {
    id: getNextMemberId(members),
    email: normalizedEmail,
    password: input.password,
    name: input.name.trim(),
    phone: DEFAULT_PHONE,
    createdAt: new Date().toISOString(),
    role: input.role,
  };

  const nextMembers = sortMembers([...members, nextMember]);
  writeMembers(nextMembers);
  return stripPasswords(nextMembers);
};

export const getAdminSeedPassword = () => DEFAULT_PASSWORD;
