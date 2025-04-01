import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BankingController } from './banking.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE', // 이름 통일
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'banking',
            brokers: ['localhost:9092'],
          },
          consumer: {
            groupId: 'banking-consumer',
          },
        },
      },
    ]),
  ],
  controllers: [BankingController],
})
export class BankingModule {}
