import { GoalCompletedHandler } from './handlers/goal-completed.handler';
import { GoalCreatedHandler } from './handlers/goal-created.handler';
import { GoalUpdatedHandler } from './handlers/goal-updated.handler';

export const EventHandlers = [
  GoalCreatedHandler,
  GoalUpdatedHandler,
  GoalCompletedHandler,
];
