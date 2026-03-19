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

export interface BoardLineCoordinates {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ExchangeRecord {
  id: string;
  createdAt: string;
  date: string;
  sendUserId: number;
  receiveUserId: number;
  sendPerson?: string;
  receivePerson?: string;
  given: string[];
}

export interface InteractionRecord {
  interaction_id?: number;
  send_user_id: number;
  receive_user_id: number;
  send_user_name?: string;
  receive_user_name?: string;
  created_at: string;
  word_id_list: string[] | string;
}

export type AlertSeverity = "success" | "warning" | "error" | "info";

export type BoardPreviewPreset = "one-line" | "two-lines" | "three-lines" | "full";

export type AlertPayload = {
  title?: string;
  keywords?: string[];
  label?: string;
  durationMs?: number;
};
