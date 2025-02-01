import { GoalCreatedHandler } from './handlers/goal-created.handler';
import { GoalUpdatedHandler } from './handlers/goal-updated.handler';
import { GoalCompletedHandler } from './handlers/goal-completed.handler';

export const EventHandlers = [
  GoalCreatedHandler,
  GoalUpdatedHandler,
  GoalCompletedHandler,
];
