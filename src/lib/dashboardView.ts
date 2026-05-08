import type { DashboardData, ReminderItem } from "@/types/dashboard";
import { stageLabels } from "@/lib/const";

export function formatReminderDate(date: string) {
  return new Date(date).toLocaleDateString();
}

export function getReminderBadgeClass(status: ReminderItem["status"]) {
  if (status === "OVERDUE") return "bg-red-100 text-red-700";
  if (status === "TODAY") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

export function getPipelineChartData(data: DashboardData | null) {
  if (!Array.isArray(data?.pipelineData)) return [];

  return data.pipelineData.map((item) => ({
    stage: stageLabels[item.stage as keyof typeof stageLabels] || item.stage,
    count: item.count,
  }));
}

