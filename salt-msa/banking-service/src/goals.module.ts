import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { Goal } from './domain/entities/goal.entity';
import { GoalRepository } from './domain/repositories/goal.repository';

import { QueryHandlers } from './application/queries';

import { GoalsController } from './interfaces/controllers/goals.controller';
import { CommandHandlers } from './application/commands';
import { EventHandlers } from './application/events';

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
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
})
export class GoalsModule {}
