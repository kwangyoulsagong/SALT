import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal } from '../entities/goal.entity';

@Injectable()
export class GoalRepository {
  constructor(
    @InjectRepository(Goal)
    private readonly repository: Repository<Goal>,
  ) {}
  async findOne(options: any): Promise<Goal | null> {
    return this.repository.findOne(options);
  }

  create(data: Partial<Goal>): Goal {
    return this.repository.create(data);
  }

  async save(goal: Goal): Promise<Goal> {
    return this.repository.save(goal);
  }

  async findByUserId(userId: string): Promise<Goal[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveGoals(userId: string): Promise<Goal[]> {
    return this.repository.find({
      where: {
        userId,
        status: 'IN_PROGRESS',
      },
    });
  }
}
