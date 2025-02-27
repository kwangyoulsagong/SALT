export type EventCallbak<T = any> = (data: T) => void;
export interface EventMessage<T = any> {
  type: string;
  payload: T;
  timestamp: number;
}
