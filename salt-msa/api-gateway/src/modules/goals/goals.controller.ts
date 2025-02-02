import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Inject,
  UseGuards,
  Logger,
  Headers,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GetUser, UserPayload } from 'src/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
@Controller('goals')
@ApiTags('목표 관리' as string)
@ApiBearerAuth('JWT-auth' as string)
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(
    @Inject('GOALS_SERVICE')
    private readonly goalsClient: ClientProxy,
  ) {}

  @Post()
  @ApiOperation({ summary: '목표 생성' })
  createGoal(
    @Body() dto: CreateGoalDto,
    @GetUser() user: UserPayload,
    @Headers('authorization') authorization: string,
  ) {
    const logger = new Logger('GoalsController');
    logger.log(JSON.stringify(dto)); // 객체를 문자열로 변환
    return this.goalsClient.send('createGoal', {
      ...dto,
      userId: user.id,
      authorization,
    });
  }

  @Get()
  @ApiOperation({ summary: '목표 목록 조회' })
  getGoals(@GetUser() user: UserPayload) {
    return this.goalsClient.send('getGoals', { userId: user.id });
  }

  @Put(':id')
  @ApiOperation({ summary: '목표 수정' })
  updateGoal(
    @Param('id') id: string,
    @Body() updateDto: UpdateGoalDto,
    @GetUser() user: UserPayload,
  ) {
    return this.goalsClient.send('updateGoal', {
      id,
      ...updateDto,
      userId: user.id,
    });
  }
}
