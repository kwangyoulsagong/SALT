import { AggregateRoot } from '@nestjs/cqrs';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GoalCreatedEvent } from '../events/goal-created.event';

@Entity('goals')
export class Goal extends AggregateRoot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  title: string;

  @Column('decimal', { precision: 10, scale: 2 })
  targetAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  currentAmount: number;

  @Column({ type: 'timestamp' })
  deadline: Date;

  @Column({
    type: 'enum',
    enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED'],
    default: 'IN_PROGRESS',
  })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  createGoal() {
    this.apply(new GoalCreatedEvent(this.id, this.userId));
  }

  updateProgress(amount: number) {
    this.currentAmount += amount;
    if (this.currentAmount >= this.targetAmount) {
      this.status = 'COMPLETED';
    }
  }

  isCompleted(): boolean {
    return this.status === 'COMPLETED';
  }
}
