export const cn = (...inputs: Array<string | false | null | undefined>) => {
  return inputs.filter(Boolean).join(" ");
};
