import type { EventName, EventPayloadMap } from "../events/registry";

export interface EventMessage<TEventName extends EventName = EventName> {
  type: TEventName;
  payload: EventPayloadMap[TEventName];
  timestamp: number;
}

export type EventCallback<TEventName extends EventName = EventName> = (
  data: EventMessage<TEventName>
) => void;

export type EventCallbak<TEventName extends EventName = EventName> =
  EventCallback<TEventName>;
