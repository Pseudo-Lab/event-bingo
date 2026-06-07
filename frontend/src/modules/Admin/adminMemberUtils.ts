import type { AdminMember } from "./adminTypes";

const resolveCreatedAtTime = (member: AdminMember) => {
  const timestamp = new Date(member.createdAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const sortAdminMembersByCreatedAtDesc = (
  members: AdminMember[],
): AdminMember[] => {
  return [...members].sort((left, right) => {
    return (
      resolveCreatedAtTime(right) - resolveCreatedAtTime(left) ||
      right.id - left.id
    );
  });
};
