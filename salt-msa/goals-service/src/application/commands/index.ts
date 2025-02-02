import { CompleteGoalHandler } from './handlers/complete-goal.handler';
import { CreateGoalHandler } from './handlers/create-goal.handler';
import { UpdateGoalHandler } from './handlers/update-goal.handler';

export const CommandHandlers = [
  CreateGoalHandler,
  UpdateGoalHandler,
  CompleteGoalHandler,
];
