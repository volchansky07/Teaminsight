export interface ContributionItem {
  employeeId: string;
  fullName: string;
  roleInProject: string;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  totalAssignedTasks: number;
  completedComplexityPoints: number;
  completedPriorityScore: number;
  onTimeCompletedTasks: number;
  overdueTasks: number;
  onTimeRate: number;
  contributionScore: number;
}