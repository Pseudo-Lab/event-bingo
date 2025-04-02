export const shuffleArray = (array: any[]) => {
  let shuffledArray = [...array];

  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }

  return shuffledArray;
};

export const defafultBingoBoard = [
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
  {
    selected: 0,
    status: 0,
    value: "",
  },
];
