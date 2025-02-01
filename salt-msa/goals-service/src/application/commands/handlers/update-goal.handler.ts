import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { GoalRepository } from 'src/domain/repositories/goal.repository';

@CommandHandler(UpdateGoalCommand)
export class UpdateGoalHandler implements ICommandHandler<UpdateGoalCommand> {
  constructor(
    @InjectRepository(GoalRepository)
    private goalRepository: GoalRepository,
    private eventBus: EventBus,
  ) {}

  async execute(command: UpdateGoalCommand) {
    const goal = await this.goalRepository.findOne(command.goalId);

    if (!goal) {
      throw new NotFoundException('목표를 찾을 수 없습니다');
    }

    const updatedGoal = await this.goalRepository.save({
      ...goal,
      ...command.updateData,
    });

    this.eventBus.publish(new GoalUpdatedEvent(updatedGoal));

    return updatedGoal;
  }
}
