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

  handle(event: GoalCreatedEvent) {
    try {
      this.kafkaClient.emit<string>('goal.created', {
        goalId: event.goalId,
        userId: event.userId,
        targetAmount: event.targetAmount,
        title: event.title,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to process goal created event:', error);
    }
  }
}
