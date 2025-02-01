import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateGoalCommand } from '../../application/commands/create-goal.command';
import { GetGoalsQuery } from '../../application/queries/get-goals.query';
import { CreateGoalDto } from '../dtos/create-goal.dto';
import { GoalResponseDto } from '../dtos/goal-response.dto';

@ApiTags('목표 관리')
@ApiBearerAuth()
@Controller('goals')
export class GoalsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({
    summary: '목표 생성',
    description: '새로운 저축 목표를 생성합니다.',
  })
  @ApiBody({ type: CreateGoalDto })
  @ApiResponse({
    status: 201,
    description: '목표 생성 성공',
    type: GoalResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 입력' })
  async createGoal(
    @Body() createGoalDto: CreateGoalDto,
  ): Promise<GoalResponseDto> {
    const goal = await this.commandBus.execute(
      new CreateGoalCommand(
        createGoalDto.userId,
        createGoalDto.title,
        createGoalDto.targetAmount,
        createGoalDto.deadline,
      ),
    );
    return new GoalResponseDto(goal);
  }

  @Get()
  @ApiOperation({
    summary: '목표 목록 조회',
    description: '사용자의 모든 저축 목표를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
    type: [GoalResponseDto],
  })
  async getGoals(@Query('userId') userId: string): Promise<GoalResponseDto[]> {
    const goals = await this.queryBus.execute(new GetGoalsQuery(userId));
    return goals.map((goal) => new GoalResponseDto(goal));
  }
}
