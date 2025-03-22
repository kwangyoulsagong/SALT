import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { GoalUpdatedEvent } from './goal-updated.event';

@EventsHandler(GoalUpdatedEvent)
export class GoalUpdatedHandler implements IEventHandler<GoalUpdatedEvent> {
  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  handle(event: GoalUpdatedEvent) {
    try {
      this.kafkaClient.emit<string>('goal.updated', {
        goalId: event.goal.id,
        userId: event.goal.userId,
        currentAmount: event.goal.currentAmount,
        targetAmount: event.goal.targetAmount,
        status: event.goal.status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to process goal updated event:', error);
    }
  }
}
