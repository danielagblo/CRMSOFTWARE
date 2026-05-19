type TaskStatus = "PENDING" | "IN_PROGRESS" | "DELIVERED" | "COMPLETED";

interface BoardUser {
  id: string;
  name: string;
  role?: string;
}

interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  message: string;
  createdAt: string;
}

interface BoardTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  startTime: string;
  deadline: string;
  timeline: string;
  status: TaskStatus;
  comments: TaskComment[];
  carriedOverFrom?: string;
  createdAt: string;
  updatedAt: string;
}

type DailyTasks = Record<string, BoardTask[]>;

export type { BoardUser, BoardTask, TaskComment, TaskStatus, DailyTasks };
