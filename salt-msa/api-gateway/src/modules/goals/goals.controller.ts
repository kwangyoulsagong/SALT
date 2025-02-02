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
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices'; // ClientProxy 대신 ClientKafka import
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OnModuleInit } from '@nestjs/common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GetUser, UserPayload } from 'src/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { firstValueFrom } from 'rxjs';

@Controller('goals')
@ApiTags('목표 관리' as string)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class GoalsController implements OnModuleInit {
  private readonly logger = new Logger(GoalsController.name);

  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly goalsClient: ClientKafka, // ClientProxy 대신 ClientKafka 사용
  ) {}

  async onModuleInit() {
    this.goalsClient.subscribeToResponseOf('createGoal');
    this.goalsClient.subscribeToResponseOf('getGoals');
    this.goalsClient.subscribeToResponseOf('updateGoal');
    await this.goalsClient.connect();
  }
  @Post()
  @ApiOperation({ summary: '목표 생성' })
  async createGoal(@Body() dto: CreateGoalDto, @GetUser() user: UserPayload) {
    this.logger.log(`Creating goal for user ${user.id}`);
    try {
      const response = await firstValueFrom(
        this.goalsClient.send('createGoal', {
          ...dto,
          userId: user.id,
        }),
      );
      this.logger.log(`Goal created successfully`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to create goal: ${error.message}`, error.stack);
      throw error;
    }
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
