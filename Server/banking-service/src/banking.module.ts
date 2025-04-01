import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

// 도메인 엔티티 및 리포지토리
import { BankAccount } from './domain/entities/bank-account.entity';
import { Transaction } from './domain/entities/transaction.entity';
import { BankAccountRepository } from './domain/repositories/bank-account.repository';
import { TransactionRepository } from './domain/repositories/transaction.repository';

// 애플리케이션 쿼리, 커맨드, 이벤트 핸들러
import { QueryHandlers } from './application/queries';
import { CommandHandlers } from './application/commands';
import { EventHandlers } from './application/events';

// 인터페이스
import { BankingController } from './interfaces/controllers/banking.controller';

@Module({
  imports: [
    // CQRS 모듈
    CqrsModule,

    // 엔티티 등록
    TypeOrmModule.forFeature([BankAccount, Transaction]),

    // Kafka 클라이언트 설정 (ConfigService 사용)
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'banking',
              brokers: [configService.get('KAFKA_BROKER', 'localhost:9092')],
            },
            consumer: {
              groupId: 'banking-consumer',
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [BankingController],
  providers: [
    // 리포지토리
    BankAccountRepository,
    TransactionRepository,

    // 모든 핸들러 등록
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
  exports: [], // 필요시 서비스 등을 다른 모듈에 제공
})
export class BankingModule {}
