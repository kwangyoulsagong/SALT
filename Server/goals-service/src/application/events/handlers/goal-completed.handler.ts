import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { GoalCompletedEvent } from './goal-completed.event';

@EventsHandler(GoalCompletedEvent)
export class GoalCompletedHandler implements IEventHandler<GoalCompletedEvent> {
  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  handle(event: GoalCompletedEvent) {
    try {
      this.kafkaClient.emit<string>('goal.completed', {
        goalId: event.goal.id,
        userId: event.goal.userId,
        targetAmount: event.goal.targetAmount,
        currentAmount: event.goal.currentAmount,
        title: event.goal.title,
        completedAt: new Date().toISOString(),
      });

      // 여기에 추가 로직을 넣을 수 있습니다
      // 예: 업적 시스템 연동, 알림 발송 등
    } catch (error) {
      console.error('Failed to process goal completed event:', error);
    }
  }
}
