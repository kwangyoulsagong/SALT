import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateGoalCommand } from '../create-goal.command';
import { GoalRepository } from '../../../domain/repositories/goal.repository';
import { Goal } from '../../../domain/entities/goal.entity';

@CommandHandler(CreateGoalCommand)
export class CreateGoalHandler implements ICommandHandler<CreateGoalCommand> {
  constructor(
    @InjectRepository(GoalRepository)
    private goalRepository: GoalRepository,
    private eventBus: EventBus,
  ) {}

  async execute(command: CreateGoalCommand): Promise<Goal> {
    const goal = this.goalRepository.create({
      userId: command.userId,
      title: command.title,
      targetAmount: command.targetAmount,
      deadline: command.deadline,
    });

    await this.goalRepository.save(goal);
    goal.createGoal(); // 이벤트 발행

    return goal;
  }
}
