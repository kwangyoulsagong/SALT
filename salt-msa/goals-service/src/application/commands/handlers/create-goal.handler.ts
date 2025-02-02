import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateGoalCommand } from '../create-goal.command';
import { GoalRepository } from '../../../domain/repositories/goal.repository';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { GoalCreatedEvent } from '../../../domain/events/goal-created.event';

@CommandHandler(CreateGoalCommand)
export class CreateGoalHandler implements ICommandHandler<CreateGoalCommand> {
  private readonly logger = new Logger(CreateGoalHandler.name);
  constructor(
    private goalRepository: GoalRepository,
    private eventBus: EventBus,
  ) {}

  async execute(command: CreateGoalCommand) {
    try {
      this.logger.log(`Creating goal for user: ${command.userId}`);
      const goal = await this.goalRepository.save(
        this.goalRepository.create({
          userId: command.userId,
          title: command.title,
          targetAmount: command.targetAmount,
          deadline: command.deadline,
          status: 'IN_PROGRESS',
          currentAmount: 0,
        }),
      );
      this.logger.log(`Goal created successfully: ${goal.id}`);
      // Event 발행
      this.eventBus.publish(new GoalCreatedEvent(goal));

      return goal;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      this.logger.error(`Failed to create goal: ${error.message}`, error.stack);
      throw new InternalServerErrorException('목표 생성 실패');
    }
  }
}
