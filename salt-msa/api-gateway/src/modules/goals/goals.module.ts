import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { GoalsController } from './goals.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'GOALS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 4001,
        },
      },
    ]),
  ],
  controllers: [GoalsController],
})
export class GoalsModule {}
