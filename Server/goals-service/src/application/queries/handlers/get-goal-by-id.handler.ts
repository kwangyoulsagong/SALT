import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { GoalRepository } from 'src/domain/repositories/goal.repository';
import { GoalResponseDto } from 'src/interfaces/dtos/goal-response.dto';
import { GetGoalByIdQuery } from '../get-goal-by-id.query';
import { Goal } from 'src/domain/entities/goal.entity';

@QueryHandler(GetGoalByIdQuery)
export class GetGoalByIdHandler implements IQueryHandler<GetGoalByIdQuery> {
  constructor(private goalRepository: GoalRepository) {}

  async execute(query: GetGoalByIdQuery) {
    const goal = await this.goalRepository.findOne({
      where: {
        id: query.goalId,
        userId: query.userId,
      },
    });

    if (!goal) {
      throw new NotFoundException('목표를 찾을 수 없습니다');
    }

    return new GoalResponseDto(goal);
  }
}
