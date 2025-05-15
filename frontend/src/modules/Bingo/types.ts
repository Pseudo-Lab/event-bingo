// Bingo shared types
export interface BingoCell {
  id: number;
  value: string;
  selected: number;
  status: number;
  note?: string;
}

export interface CompletedLine {
  type: string;
  index: number;
}

export interface ExchangeRecord {
  id: number;
  date: string;
  sendPerson?: string;
  sendPersonProfileUrl?: string;
  receivePerson?: string;
  receivePersonProfileUrl?: string;
  given?: string;
} 