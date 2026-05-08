interface DashboardData {
  totalLeads: number;
  leadsInProgress: number;
  dealsClosed: number;
  totalRevenue: number;
  pipelineData: { stage: string; count: number }[];
}

interface ReminderItem {
  leadId: string;
  clientName: string;
  stage: string;
  fieldKey: string;
  fieldLabel: string;
  dueDate: string;
  status: "OVERDUE" | "TODAY" | "UPCOMING";
}

export type { DashboardData, ReminderItem };
