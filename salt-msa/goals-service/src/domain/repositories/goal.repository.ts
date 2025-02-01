import { EntityRepository, Repository } from 'typeorm';
import { Goal } from '../entities/goal.entity';

@EntityRepository(Goal)
export class GoalRepository extends Repository<Goal> {
  async findByUserId(userId: string): Promise<Goal[]> {
    return this.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveGoals(userId: string): Promise<Goal[]> {
    return this.find({
      where: {
        userId,
        status: 'IN_PROGRESS',
      },
    });
  }
}
