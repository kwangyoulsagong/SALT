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

@ApiTags('목표 관리')
@ApiBearerAuth()
@Controller('goals')
export class GoalsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: '목표 생성' })
  @ApiResponse({
    status: 201,
    type: GoalResponseDto,
  })
  async createGoal(@Body() dto: CreateGoalDto): Promise<GoalResponseDto> {
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

  @Get()
  @ApiOperation({ summary: '목표 목록 조회' })
  @ApiResponse({
    status: 200,
    type: [GoalResponseDto],
  })
  async getGoals(@Query('userId') userId: string): Promise<GoalResponseDto[]> {
    const goals = await this.queryBus.execute<GetGoalsQuery, Goal[]>(
      new GetGoalsQuery(userId),
    );
    return goals.map((goal) => new GoalResponseDto(goal));
  }

  @Put(':id')
  @ApiOperation({ summary: '목표 수정' })
  @ApiResponse({
    status: 200,
    type: GoalResponseDto,
  })
  async updateGoal(
    @Param('id') id: string,
    @Body() updateGoalDto: UpdateGoalDto,
  ): Promise<GoalResponseDto> {
    const goal = await this.commandBus.execute<UpdateGoalCommand, Goal>(
      new UpdateGoalCommand(id, updateGoalDto),
    );
    return new GoalResponseDto(goal);
  }
}
