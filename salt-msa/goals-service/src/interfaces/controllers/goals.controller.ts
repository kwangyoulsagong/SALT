import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Put,
  Logger,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateGoalCommand } from '../../application/commands/create-goal.command';
import { GetGoalsQuery } from '../../application/queries/get-goals.query';
import { CreateGoalDto } from '../dtos/create-goal.dto';
import { GoalResponseDto } from '../dtos/goal-response.dto';
import { Goal } from '../types/goal.interface';
import { UpdateGoalDto } from '../dtos/update-goal.dto';
import { UpdateGoalCommand } from 'src/application/commands/update-goal.command';
import { MessagePattern, Payload } from '@nestjs/microservices';

@ApiTags('목표 관리')
@ApiBearerAuth()
@Controller('goals')
export class GoalsController {
  private readonly logger = new Logger(GoalsController.name);
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // HTTP 엔드포인트용
  @Post()
  @ApiOperation({ summary: '목표 생성' })
  @ApiResponse({
    status: 201,
    type: GoalResponseDto,
  })
  async createGoalHttp(@Body() dto: CreateGoalDto): Promise<GoalResponseDto> {
    const goal = await this.commandBus.execute<CreateGoalCommand, Goal>(
      new CreateGoalCommand(
        dto.userId,
        dto.title,
        dto.targetAmount,
        dto.deadline,
      ),
    );
    return new GoalResponseDto(goal);
  }

  // Kafka 메시지용
  @MessagePattern('createGoal')
  async createGoal(
    @Payload() data: { userId: string } & CreateGoalDto,
  ): Promise<GoalResponseDto> {
    this.logger.log(`Received createGoal message for user ${data.userId}`);
    try {
      const goal = await this.commandBus.execute<CreateGoalCommand, Goal>(
        new CreateGoalCommand(
          data.userId,
          data.title,
          data.targetAmount,
          data.deadline,
        ),
      );
      this.logger.log(`Goal created successfully for user ${data.userId}`);
      return new GoalResponseDto(goal);
    } catch (error) {
      this.logger.error(`Failed to create goal: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('getGoals')
  async getGoals(
    @Payload() data: { userId: string },
  ): Promise<GoalResponseDto[]> {
    this.logger.log(`Received getGoals message for user ${data.userId}`);
    try {
      const goals = await this.queryBus.execute<GetGoalsQuery, Goal[]>(
        new GetGoalsQuery(data.userId),
      );
      this.logger.log(`Successfully retrieved goals for user ${data.userId}`);
      return goals.map((goal) => new GoalResponseDto(goal));
    } catch (error) {
      this.logger.error(`Failed to get goals: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern('updateGoal')
  async updateGoal(
    @Payload() data: { id: string; userId: string } & UpdateGoalDto,
  ): Promise<GoalResponseDto> {
    this.logger.log(`Received updateGoal message for goal ${data.id}`);
    try {
      const { id, userId, ...updateData } = data; // userId와 id를 분리
      const goal = await this.commandBus.execute<UpdateGoalCommand, Goal>(
        new UpdateGoalCommand(id, updateData), // updateData만 전달
      );
      this.logger.log(`Successfully updated goal ${id}`);
      return new GoalResponseDto(goal);
    } catch (error) {
      this.logger.error(`Failed to update goal: ${error.message}`, error.stack);
      throw error;
    }
  }
}
