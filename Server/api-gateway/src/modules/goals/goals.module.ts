import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { GoalsController } from './goals.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE', // 이름 통일
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
})
export class GoalsModule {}
