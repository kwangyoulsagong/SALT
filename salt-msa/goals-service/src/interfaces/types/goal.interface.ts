export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
