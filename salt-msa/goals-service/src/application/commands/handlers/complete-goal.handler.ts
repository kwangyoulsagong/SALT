import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { CompleteGoalCommand } from '../complete-goal.command';
import { GoalRepository } from '../../../domain/repositories/goal.repository';
import { GoalCompletedEvent } from 'src/application/events/handlers/goal-completed.event';
import { Goal } from 'src/domain/entities/goal.entity';

@CommandHandler(CompleteGoalCommand)
export class CompleteGoalHandler
  implements ICommandHandler<CompleteGoalCommand>
{
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CompleteGoalCommand) {
    const goal = await this.goalRepository.findOne({
      where: {
        id: command.goalId,
        userId: command.userId,
      },
    });

    if (!goal) {
      throw new NotFoundException('목표를 찾을 수 없습니다');
    }

    goal.status = 'COMPLETED';
    const completedGoal = await this.goalRepository.save(goal);

    this.eventBus.publish(new GoalCompletedEvent(completedGoal));

    return completedGoal;
  }
}
