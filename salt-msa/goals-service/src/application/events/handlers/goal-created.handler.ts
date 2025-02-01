import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { GoalCreatedEvent } from '../../../domain/events/goal-created.event';

@EventsHandler(GoalCreatedEvent)
export class GoalCreatedHandler implements IEventHandler<GoalCreatedEvent> {
  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  async handle(event: GoalCreatedEvent) {
    try {
      // Kafka로 이벤트 발행
      await this.kafkaClient.emit('goal.created', {
        goalId: event.goal.id,
        userId: event.goal.userId,
        targetAmount: event.goal.targetAmount,
        timestamp: new Date().toISOString(),
      });

      // Redis 캐시 업데이트 등 추가 작업 가능
    } catch (error) {
      console.error('Failed to process goal created event:', error);
    }
  }
}
