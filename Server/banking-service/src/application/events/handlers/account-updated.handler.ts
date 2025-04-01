import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { AccountUpdatedEvent } from './account-updated.event';

@EventsHandler(AccountUpdatedEvent)
export class AccountUpdatedHandler
  implements IEventHandler<AccountUpdatedEvent>
{
  private readonly logger = new Logger(AccountUpdatedHandler.name);

  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  handle(event: AccountUpdatedEvent) {
    try {
      this.logger.log(
        `Publishing account.updated event for account: ${event.account.id}`,
      );

      // 숫자로 변환하여 이벤트 발행
      const balance =
        typeof event.account.balance === 'string'
          ? parseFloat(event.account.balance)
          : event.account.balance;

      // Kafka로 이벤트 발행
      this.kafkaClient.emit<string>('account.updated', {
        accountId: event.account.id,
        userId: event.account.userId,
        bankName: event.account.bankName,
        accountNumber: event.account.accountNumber,
        balance: balance,
        updatedAt: event.account.updatedAt.toISOString(),
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Successfully published account.updated event for account: ${event.account.id}`,
      );
    } catch (error: unknown) {
      // 에러에 타입 지정 및 안전하게 속성 접근
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to process account updated eventt: ${errorMessage}`,
        errorStack,
      );
    }
  }
}
