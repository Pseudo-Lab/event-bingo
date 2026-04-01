const normalizeSlugCharacters = (value: string) => {
  return value
    .toLowerCase()
    .trimStart()
    .replace(/[^a-z0-9가-힣-]+/g, "-")
    .replace(/-+/g, "-");
};

const CHOSEONG_ROMANIZATION = [
  "g",
  "kk",
  "n",
  "d",
  "tt",
  "r",
  "m",
  "b",
  "pp",
  "s",
  "ss",
  "",
  "j",
  "jj",
  "ch",
  "k",
  "t",
  "p",
  "h",
];

const JUNGSEONG_ROMANIZATION = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
];

const JONGSEONG_ROMANIZATION = [
  "",
  "k",
  "k",
  "k",
  "n",
  "n",
  "n",
  "t",
  "l",
  "k",
  "m",
  "l",
  "l",
  "l",
  "p",
  "l",
  "m",
  "p",
  "p",
  "t",
  "t",
  "ng",
  "t",
  "t",
  "k",
  "t",
  "p",
  "t",
];

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const JUNGSEONG_COUNT = 21;
const JONGSEONG_COUNT = 28;

const romanizeHangulSyllable = (character: string) => {
  const codePoint = character.charCodeAt(0);
  if (codePoint < HANGUL_BASE || codePoint > HANGUL_END) {
    return character;
  }

  const syllableIndex = codePoint - HANGUL_BASE;
  const choseongIndex = Math.floor(syllableIndex / (JUNGSEONG_COUNT * JONGSEONG_COUNT));
  const jungseongIndex = Math.floor(
    (syllableIndex % (JUNGSEONG_COUNT * JONGSEONG_COUNT)) / JONGSEONG_COUNT
  );
  const jongseongIndex = syllableIndex % JONGSEONG_COUNT;

  return `${CHOSEONG_ROMANIZATION[choseongIndex]}${JUNGSEONG_ROMANIZATION[jungseongIndex]}${JONGSEONG_ROMANIZATION[jongseongIndex]}`;
};

export const recommendEnglishSlugFromName = (value: string) => {
  const romanizedSource = Array.from(value)
    .map((character) => romanizeHangulSyllable(character))
    .join("");

  return romanizedSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const normalizeSlugDraftInput = (value: string) => {
  return normalizeSlugCharacters(value).replace(/^-+/, "");
};

export const normalizeSlugForSave = (value: string) => {
  return normalizeSlugDraftInput(value).replace(/-+$/g, "");
};
