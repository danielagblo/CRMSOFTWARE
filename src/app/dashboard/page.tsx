"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { formatCurrency } from "@/lib/siteSettings";
import { DashboardData, ReminderItem } from "@/types/dashboard";
import { stageLabels } from "@/lib/const";
import { KpiCard } from "@/components/KpiCard";
import { WidgetCard } from "@/components/WidgetCard";
import {
  formatReminderDate,
  getPipelineChartData,
  getReminderBadgeClass,
} from "@/lib/dashboardView";

export default function Dashboard() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [remindersError, setRemindersError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    // Load user from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== "ADMIN") {
        router.replace("/pipeline");
        return () => controller.abort();
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(parsedUser);
      // eslint-disable-next-line react-hooks/immutability
      fetchDashboardData(controller.signal);
    } else {
      router.replace("/login");
      setStatus("error");
      setErrorMessage("Not authenticated.");
    }

    return () => controller.abort();
  }, [router]);

  const fetchDashboardData = async (signal?: AbortSignal) => {
    try {
      setStatus("loading");
      setErrorMessage(null);
      setRemindersError(null);

      const [dashboardResult, remindersResult] = await Promise.allSettled([
        fetchWithAuth("/api/dashboard", { signal }),
        fetchWithAuth("/api/reminders", { signal }),
      ]);

      if (dashboardResult.status === "rejected") {
        setStatus("error");
        setErrorMessage(
          dashboardResult.reason?.message || "Failed to load dashboard."
        );
        return;
      }

      const dashboardRes = dashboardResult.value;
      if (!dashboardRes.ok) {
        setStatus("error");
        setErrorMessage("Failed to load dashboard.");
        return;
      }

      const dashboardData = (await dashboardRes.json()) as DashboardData;
      setData(dashboardData);

      if (remindersResult.status === "rejected") {
        setReminders([]);
        setRemindersError("Reminders unavailable.");
      } else {
        const remindersRes = remindersResult.value;
        const remindersData = remindersRes.ok ? await remindersRes.json() : [];
        setReminders(Array.isArray(remindersData) ? remindersData : []);
        if (!remindersRes.ok) {
          setRemindersError("Reminders unavailable.");
        }
      }

      setStatus("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load dashboard."
      );
    }
  };

  const chartData = useMemo(() => {
    return getPipelineChartData(data);
  }, [data]);

  const kpis = [
    {
      title: "Total Leads",
      value: data?.totalLeads || 0,
      gradientClass: "from-blue-50 to-white",
      icon: (
        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
          <span className="text-(--white) text-sm font-medium">L</span>
        </div>
      ),
    },

    {
      title: "In Progress",
      value: data?.leadsInProgress || 0,
      gradientClass: "from-amber-50 to-white",
      icon: (
        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
          <span className="text-(--white) text-sm font-medium">P</span>
        </div>
      ),
    },

    {
      title: "Deals Closed",
      value: data?.dealsClosed || 0,
      gradientClass: "from-green-50 to-white",
      icon: (
        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
          <span className="text-(--white) text-sm font-medium">C</span>
        </div>
      ),
    },

    {
      title: "Total Revenue",
      value: formatCurrency(data?.totalRevenue || 0),
      gradientClass: "from-purple-50 to-white",
      icon: (
        <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
          <span className="text-(--white) text-sm font-medium">$</span>
        </div>
      ),
    },
  ];

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <h1 className="text-lg font-semibold text-gray-900">
            Dashboard unavailable
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {errorMessage || "Something went wrong while loading the dashboard."}
          </p>
          <button
            type="button"
            onClick={() => fetchDashboardData()}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-(--white) hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-full mx-auto py-6 sm:px-6 lg:px-8 2xl:px-12">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <p className="text-sm font-medium text-indigo-600">Overview</p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Welcome back, {user?.name || "User"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track your pipeline progress, revenue, and upcoming follow-ups.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 mb-6">
            {kpis.map((kpi) => (
              <KpiCard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                icon={kpi.icon}
                gradientClass={kpi.gradientClass}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
            <WidgetCard title="Pipeline Distribution">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </WidgetCard>

            <WidgetCard title="Quick Actions">
              <div className="space-y-4">
                <Link
                  href="/pipeline"
                  className="block w-full bg-indigo-600 text-(--white) text-center py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  View Pipeline
                </Link>
                <Link
                  href="/leads"
                  className="block w-full bg-emerald-600 text-(--white) text-center py-2.5 px-4 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Manage Leads
                </Link>
              </div>
            </WidgetCard>

            <WidgetCard
              title="Reminders"
              className="max-h-[420px]"
              bodyClassName="flex flex-col"
            >
              {remindersError ? (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  {remindersError}
                </div>
              ) : null}
              {reminders.length === 0 ? (
                <div className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg p-4 bg-gray-50">
                  No pending reminders yet.
                </div>
              ) : (
                <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
                  {reminders.slice(0, 10).map((reminder, index) => (
                    <div
                      key={`${reminder.leadId}-${reminder.fieldKey}-${reminder.dueDate}-${index}`}
                      className="border border-gray-200 rounded-lg p-3 bg-gradient-to-r from-white to-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {reminder.clientName}
                          </p>
                          <p className="text-xs text-gray-600">
                            {reminder.fieldLabel}
                          </p>
                          <p className="text-xs text-gray-500">
                            {stageLabels[
                              reminder.stage as keyof typeof stageLabels
                            ] || reminder.stage}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getReminderBadgeClass(reminder.status)}`}
                        >
                          {reminder.status}
                        </span>
                      </div>
                      <p className="text-sm mt-2 text-gray-700">
                        Due: {formatReminderDate(reminder.dueDate)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </WidgetCard>
          </div>
        </div>
      </div>
    </div>
  );
}
