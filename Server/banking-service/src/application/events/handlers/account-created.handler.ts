import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { AccountCreatedEvent } from './account-created.event';

@EventsHandler(AccountCreatedEvent)
export class AccountCreatedHandler
  implements IEventHandler<AccountCreatedEvent>
{
  private readonly logger = new Logger(AccountCreatedHandler.name);

  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  handle(event: AccountCreatedEvent) {
    try {
      this.logger.log(
        `Publishing account.created event for account: ${event.account.id}`,
      );

      // 숫자로 변환하여 이벤트 발행
      const balance =
        typeof event.account.balance === 'string'
          ? parseFloat(event.account.balance)
          : event.account.balance;

      // Kafka로 이벤트 발행
      this.kafkaClient.emit<string>('account.created', {
        accountId: event.account.id,
        userId: event.account.userId,
        bankName: event.account.bankName,
        accountNumber: event.account.accountNumber,
        balance: balance,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Successfully published account.created event for account: ${event.account.id}`,
      );
    } catch (error: unknown) {
      // 에러에 타입 지정 및 안전하게 속성 접근
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to process account created event: ${errorMessage}`,
        errorStack,
      );
    }
  }
}
