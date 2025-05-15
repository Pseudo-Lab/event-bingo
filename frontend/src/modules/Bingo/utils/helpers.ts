export const shuffleArray = <T>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

export const getCellNote = (index: number): string | undefined => {
  return undefined;
};

export const getCellsInLine = (type: string, index: number): number[] => {
  const cells: number[] = [];
  
  if (type === 'row') {
    for (let col = 0; col < 5; col++) {
      cells.push(index * 5 + col);
    }
  } else if (type === 'col') {
    for (let row = 0; row < 5; row++) {
      cells.push(row * 5 + index);
    }
  } else if (type === 'diagonal' && index === 1) {
    for (let i = 0; i < 5; i++) {
      cells.push(i * 5 + i);
    }
  } else if (type === 'diagonal' && index === 2) {
    for (let i = 0; i < 5; i++) {
      cells.push(i * 5 + (4 - i));
    }
  }
  
  return cells;
}; 