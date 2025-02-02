// src/application/commands/handlers/update-goal.handler.ts
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateGoalCommand } from '../update-goal.command';

import { GoalRepository } from '../../../domain/repositories/goal.repository';
import { Goal } from '../../../domain/entities/goal.entity';
import { GoalUpdatedEvent } from 'src/application/events/handlers/goal-updated.event';

@CommandHandler(UpdateGoalCommand)
export class UpdateGoalHandler implements ICommandHandler<UpdateGoalCommand> {
  constructor(
    private goalRepository: GoalRepository,
    private eventBus: EventBus,
  ) {}

  async execute(command: UpdateGoalCommand): Promise<Goal> {
    const goal = await this.goalRepository.findOne({
      where: { id: command.goalId },
    });

    if (!goal) {
      throw new NotFoundException('목표를 찾을 수 없습니다');
    }
    // 엔티티의 속성들만 업데이트
    Object.assign(goal, command.updateData);
    // 수정된 엔티티 저장
    const updatedGoal = await this.goalRepository.save(goal);

    this.eventBus.publish(new GoalUpdatedEvent(updatedGoal));

    return updatedGoal;
  }
}
