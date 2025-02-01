import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { GoalsController } from './interfaces/controllers/goals.controller';
import { GoalRepository } from './domain/repositories/goal.repository';
import { CreateGoalHandler } from './application/commands/handlers/create-goal.handler';
import { GetGoalsHandler } from './application/queries/handlers/get-goals.handler';
import { GoalCreatedHandler } from './application/events/handlers/goal-created.handler';
import { Goal } from './domain/entities/goal.entity';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([Goal]),
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'goals',
            brokers: ['localhost:9092'],
          },
          consumer: {
            groupId: 'goals-consumer',
          },
        },
      },
    ]),
  ],
  controllers: [GoalsController],
  providers: [
    GoalRepository,
    CreateGoalHandler,
    GetGoalsHandler,
    GoalCreatedHandler,
  ],
})
export class GoalsModule {}
