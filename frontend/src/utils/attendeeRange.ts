export const ATTENDEE_RANGE_OPTIONS = [
  { value: "50", count: 50, label: "50명 이하" },
  { value: "100", count: 100, label: "51-100명" },
  { value: "200", count: 200, label: "101-200명" },
  { value: "201", count: 201, label: "201명 이상" },
] as const;

export const isAttendeeRangeValue = (value: string) =>
  ATTENDEE_RANGE_OPTIONS.some((option) => option.value === value);

export const formatAttendeeRangeCount = (value?: number | null) => {
  if (value == null) {
    return "미설정";
  }

  const rangeOption = ATTENDEE_RANGE_OPTIONS.find(
    (option) => option.count === value,
  );

  return rangeOption?.label ?? `${value.toLocaleString("en-US")}명`;
};
