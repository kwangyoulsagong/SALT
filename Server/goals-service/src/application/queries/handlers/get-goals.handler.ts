import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { GetGoalsQuery } from '../get-goals.query';
import { GoalRepository } from '../../../domain/repositories/goal.repository';
import { GoalResponseDto } from 'src/interfaces/dtos/goal-response.dto';
import { InternalServerErrorException } from '@nestjs/common';

@QueryHandler(GetGoalsQuery)
export class GetGoalsHandler implements IQueryHandler<GetGoalsQuery> {
  constructor(private goalRepository: GoalRepository) {}

  async execute(query: GetGoalsQuery) {
    try {
      const goals = await this.goalRepository.findByUserId(query.userId);
      return goals.map((goal) => new GoalResponseDto(goal));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new InternalServerErrorException('목표 조회 실패');
    }
  }
}
