"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
  BoardUser,
  BoardTask,
  TaskStatus,
  DailyTasks,
} from "@/types/taskboard";

const STORAGE_KEY = "taskboard_daily_tasks_v1";
const statusFlow: TaskStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "DELIVERED",
  "COMPLETED",
];

const statusMeta: Record<
  TaskStatus,
  { label: string; chip: string; border: string }
> = {
  PENDING: {
    label: "Pending",
    chip: "bg-slate-100 text-slate-700",
    border: "border-slate-300",
  },
  IN_PROGRESS: {
    label: "In Progress",
    chip: "bg-cyan-100 text-cyan-700",
    border: "border-cyan-300",
  },
  DELIVERED: {
    label: "Delivered",
    chip: "bg-indigo-100 text-indigo-700",
    border: "border-indigo-300",
  },
  COMPLETED: {
    label: "Completed",
    chip: "bg-indigo-100 text-indigo-700",
    border: "border-indigo-300",
  },
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toDateTimeLocalValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const moveDateKey = (dateKey: string, amount: number) => {
  const next = fromDateKey(dateKey);
  next.setDate(next.getDate() + amount);
  return toDateKey(next);
};

const getStatusRank = (status: TaskStatus) => statusFlow.indexOf(status);

const parseTasks = (): DailyTasks => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as DailyTasks;
  } catch {
    return {};
  }
};

const saveTasks = (tasks: DailyTasks) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

const createTaskId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const createCommentId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export default function TaskBoardPage() {
  const today = useMemo(() => toDateKey(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [users, setUsers] = useState<BoardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<BoardUser | null>(null);
  const [tasksByDate, setTasksByDate] = useState<DailyTasks>({});

  const [title, setTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [timeline, setTimeline] = useState("");
  const [startTime, setStartTime] = useState("");
  const [deadline, setDeadline] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskOriginalDate, setEditingTaskOriginalDate] = useState<string | null>(null);
  const [editingTaskOriginalStartTime, setEditingTaskOriginalStartTime] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [weekTransitionDirection, setWeekTransitionDirection] = useState(0);

  const isAdmin = currentUser?.role === "ADMIN";

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as BoardUser;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentUser(parsed);
        setAssignedTo(parsed.id || "");
      } catch {
        setCurrentUser(null);
      }
    }

    const existing = parseTasks();
    setTasksByDate(existing);
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser?.id) return;
      try {
        const response = await fetchWithAuth("/api/users");
        if (response.ok) {
          const data = (await response.json()) as BoardUser[];
          setUsers(data);
          if (!assignedTo && data.length > 0) {
            setAssignedTo(data[0].id);
          }
          return;
        }
      } catch {
        // fallback to local user below
      }

      setUsers([
        {
          id: currentUser.id,
          name: currentUser.name || "Team Member",
          role: currentUser.role,
        },
      ]);
      if (!assignedTo) {
        setAssignedTo(currentUser.id);
      }
    };

    fetchUsers();
  }, [currentUser, assignedTo]);

  useEffect(() => {
    if (!currentUser) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTasksByDate((prev) => {
      if (prev[selectedDate]) return prev;

      const previousDateKey = moveDateKey(selectedDate, -1);
      const previousDayTasks = prev[previousDateKey] || [];
      const carryOverTasks = previousDayTasks
        .filter(
          (task) => task.status !== "COMPLETED" && task.status !== "DELIVERED",
        )
        .map((task) => ({
          ...task,
          id: createTaskId(),
          comments: task.comments,
          carriedOverFrom: previousDateKey,
          updatedAt: new Date().toISOString(),
        }));

      const nextState = {
        ...prev,
        [selectedDate]: carryOverTasks,
      };
      saveTasks(nextState);
      return nextState;
    });
  }, [selectedDate, currentUser]);

  useEffect(() => {
    const autoStartTasks = () => {
      setTasksByDate((prev) => {
        const now = Date.now();
        let hasChanges = false;
        const nextState: DailyTasks = {};

        for (const [dateKey, tasks] of Object.entries(prev)) {
          let changedInDay = false;
          const updatedTasks = tasks.map((task) => {
            if (task.status !== "PENDING") return task;
            const startAt = new Date(task.startTime).getTime();
            if (Number.isNaN(startAt) || startAt > now) return task;

            changedInDay = true;
            return {
              ...task,
              status: "IN_PROGRESS" as TaskStatus,
              updatedAt: new Date().toISOString(),
            };
          });

          nextState[dateKey] = changedInDay ? updatedTasks : tasks;
          if (changedInDay) hasChanges = true;
        }

        if (!hasChanges) return prev;
        saveTasks(nextState);
        return nextState;
      });
    };

    autoStartTasks();
    const intervalId = window.setInterval(autoStartTasks, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const weekDates = useMemo(() => {
    const anchor = fromDateKey(selectedDate);
    const day = anchor.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    anchor.setDate(anchor.getDate() + mondayOffset);

    return Array.from({ length: 5 }).map((_, index) => {
      const date = new Date(anchor);
      date.setDate(anchor.getDate() + index);
      const dateKey = toDateKey(date);
      return {
        dateKey,
        dayLabel: date.toLocaleDateString(undefined, { weekday: "short" }),
        dateLabel: date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        isToday: dateKey === today,
        isSelected: dateKey === selectedDate,
      };
    });
  }, [selectedDate, today]);

  const visibleTasksByDate = useMemo(() => {
    const result: Record<string, BoardTask[]> = {};
    weekDates.forEach(({ dateKey }) => {
      const dayTasks = tasksByDate[dateKey] || [];
      result[dateKey] = isAdmin
        ? dayTasks
        : dayTasks.filter((task) => task.assignedTo === currentUser?.id);
    });
    return result;
  }, [tasksByDate, weekDates, isAdmin, currentUser]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTimeline("");
    setStartTime("");
    setDeadline("");
    setEditingTaskId(null);
    setEditingTaskOriginalDate(null);
    setEditingTaskOriginalStartTime(null);
    setShowTaskForm(false);
  };

  const upsertTask = () => {
    if (
      !currentUser ||
      !title.trim() ||
      !assignedTo ||
      !startTime ||
      !deadline ||
      !timeline.trim()
    ) {
      toast.error(
        "Please complete task title, assigned user, timeline, start time, and deadline.",
      );
      return;
    }

    const parsedStartTime = new Date(startTime);
    if (Number.isNaN(parsedStartTime.getTime())) {
      toast.error("Please enter a valid start time.");
      return;
    }

    const nowTs = Date.now();
    const originalStartTimeValue = editingTaskOriginalStartTime
      ? new Date(editingTaskOriginalStartTime).getTime()
      : null;
    if (
      parsedStartTime.getTime() < nowTs &&
      (!editingTaskId || originalStartTimeValue !== parsedStartTime.getTime())
    ) {
      toast.error("You cannot set a task start time in the past.");
      return;
    }

    const taskDateKey = toDateKey(parsedStartTime);
    const assignedUser = users.find((user) => user.id === assignedTo);
    const nowIso = new Date().toISOString();

    const isEditing = Boolean(editingTaskId);
    setTasksByDate((prev) => {
      if (editingTaskId) {
        const originalDate = editingTaskOriginalDate || taskDateKey;
        const sourceTasks = [...(prev[originalDate] || [])];
        const targetTasks =
          originalDate === taskDateKey ? sourceTasks : [...(prev[taskDateKey] || [])];
        const originalIndex = sourceTasks.findIndex((task) => task.id === editingTaskId);

        if (originalIndex < 0) return prev;

        const updatedTask = {
          ...sourceTasks[originalIndex],
          title: title.trim(),
          description: description.trim(),
          assignedTo,
          assignedToName: assignedUser?.name || "Unknown User",
          timeline: timeline.trim(),
          startTime,
          deadline,
          updatedAt: nowIso,
        };

        if (originalDate === taskDateKey) {
          sourceTasks[originalIndex] = updatedTask;
        } else {
          sourceTasks.splice(originalIndex, 1);
          targetTasks.unshift(updatedTask);
        }

        const next = {
          ...prev,
          [originalDate]: sourceTasks,
          [taskDateKey]: targetTasks,
        };
        saveTasks(next);
        return next;
      }

      const dailyTasks = [...(prev[taskDateKey] || [])];
      dailyTasks.unshift({
        id: createTaskId(),
        title: title.trim(),
        description: description.trim(),
        assignedTo,
        assignedToName: assignedUser?.name || "Unknown User",
        timeline: timeline.trim(),
        startTime,
        deadline,
        status: "PENDING",
        comments: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      const next = { ...prev, [taskDateKey]: dailyTasks };
      saveTasks(next);
      return next;
    });

    toast.success(isEditing ? "Task updated successfully." : "Task added successfully.");
    resetForm();
  };

  const editTask = (task: BoardTask, dateKey: string) => {
    setSelectedDate(dateKey);
    setEditingTaskOriginalDate(dateKey);
    setEditingTaskOriginalStartTime(task.startTime);
    setShowTaskForm(true);
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description);
    setAssignedTo(task.assignedTo);
    setTimeline(task.timeline);
    setStartTime(task.startTime);
    setDeadline(task.deadline);
  };

  const deleteTask = (taskId: string, dateKey: string) => {
    if (!currentUser || !isAdmin) return;
    const confirmed = window.confirm("Delete this task permanently?");
    if (!confirmed) return;

    let didDelete = false;
    setTasksByDate((prev) => {
      const dailyTasks = prev[dateKey] || [];
      const nextDailyTasks = dailyTasks.filter((task) => task.id !== taskId);
      if (nextDailyTasks.length === dailyTasks.length) return prev;

      const next = { ...prev, [dateKey]: nextDailyTasks };
      saveTasks(next);
      didDelete = true;
      return next;
    });

    if (editingTaskId === taskId) {
      resetForm();
    }
    if (didDelete) {
      toast.success("Task deleted successfully.");
    }
  };

  const appendCommentToTask = (task: BoardTask, message: string): BoardTask => {
    if (!currentUser || !message.trim()) return task;
    return {
      ...task,
      comments: [
        ...task.comments,
        {
          id: createCommentId(),
          authorId: currentUser.id,
          authorName: currentUser.name || "Team Member",
          message: message.trim(),
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  };

  const updateTaskStatus = (
    taskId: string,
    status: TaskStatus,
    completionComment?: string,
    dateKey = selectedDate,
  ) => {
    if (!currentUser) return;
    let didUpdate = false;
    setTasksByDate((prev) => {
      const dailyTasks = [...(prev[dateKey] || [])];
      const index = dailyTasks.findIndex((task) => task.id === taskId);
      if (index < 0) return prev;

      const task = dailyTasks[index];
      if (!isAdmin && task.assignedTo !== currentUser.id) return prev;
      const currentRank = getStatusRank(task.status);
      const nextRank = getStatusRank(status);

      // Enforce irreversible status progression (forward only).
      if (nextRank < currentRank) {
        toast.error(
          "Status updates are irreversible. You can only move a task forward.",
        );
        return prev;
      }

      let updatedTask: BoardTask = {
        ...task,
        status,
        updatedAt: new Date().toISOString(),
      };
      if (status === "COMPLETED" && completionComment?.trim()) {
        updatedTask = appendCommentToTask(
          updatedTask,
          `Completion note: ${completionComment.trim()}`,
        );
      }

      dailyTasks[index] = updatedTask;
      const next = { ...prev, [dateKey]: dailyTasks };
      saveTasks(next);
      didUpdate = true;
      return next;
    });
    if (didUpdate) {
      toast.success(`Task marked ${statusMeta[status].label}.`);
    }
  };

  const addComment = (
    taskId: string,
    message: string,
    dateKey = selectedDate,
  ) => {
    if (!currentUser) return;
    const nextMessage = message.trim();
    if (!nextMessage) {
      toast.error("Comment cannot be empty.");
      return;
    }

    let didAdd = false;
    setTasksByDate((prev) => {
      const dailyTasks = [...(prev[dateKey] || [])];
      const index = dailyTasks.findIndex((task) => task.id === taskId);
      if (index < 0) return prev;

      const task = dailyTasks[index];
      dailyTasks[index] = appendCommentToTask(task, nextMessage);

      const next = { ...prev, [dateKey]: dailyTasks };
      saveTasks(next);
      didAdd = true;
      return next;
    });
    if (didAdd) {
      toast.success("Comment added.");
    }
  };

  const getTaskBorder = (task: BoardTask) => {
    const deadlineAt = new Date(task.deadline);
    const overdue =
      task.status !== "COMPLETED" &&
      !Number.isNaN(deadlineAt.getTime()) &&
      deadlineAt < new Date();
    if (overdue) return "border-red-300";
    return statusMeta[task.status].border;
  };

  const prettySelectedDate = useMemo(() => {
    const parsed = fromDateKey(selectedDate);
    return parsed.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [selectedDate]);

  const searchableTasksByDate = useMemo(() => {
    const result: Record<string, BoardTask[]> = {};
    Object.entries(tasksByDate).forEach(([dateKey, tasks]) => {
      result[dateKey] = isAdmin
        ? tasks
        : tasks.filter((task) => task.assignedTo === currentUser?.id);
    });
    return result;
  }, [tasksByDate, isAdmin, currentUser]);

  const boardSearchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return visibleTasksByDate;
    const filtered: Record<string, BoardTask[]> = {};
    Object.entries(searchableTasksByDate).forEach(([dateKey, tasks]) => {
      filtered[dateKey] = tasks.filter((task) => {
        const searchable =
          `${task.title} ${task.description} ${task.assignedToName} ${task.timeline}`.toLowerCase();
        return searchable.includes(query);
      });
    });
    return filtered;
  }, [visibleTasksByDate, searchableTasksByDate, searchQuery]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) return;

    const hasVisibleMatch = weekDates.some((day) => {
      const dayTasks = boardSearchResults[day.dateKey] || [];
      return dayTasks.length > 0;
    });

    if (hasVisibleMatch) return;

    const firstMatchDate = Object.keys(boardSearchResults)[0];
    if (firstMatchDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDate(firstMatchDate);
    }
  }, [boardSearchResults, searchQuery, weekDates]);

  const openCreateTaskForm = () => {
    setShowTaskForm(true);
  };

  const moveByWeek = (amount: number) => {
    setWeekTransitionDirection(amount > 0 ? 1 : -1);
    setSelectedDate((prev) => moveDateKey(prev, amount));
  };

  useEffect(() => {
    if (weekTransitionDirection === 0) return;
    const timeoutId = window.setTimeout(() => {
      setWeekTransitionDirection(0);
    }, 320);
    return () => window.clearTimeout(timeoutId);
  }, [selectedDate, weekTransitionDirection]);

  return (
    <div
      className="relative h-[calc(100vh-4rem)] p-3 sm:p-4 bg-gradient-to-br from-indigo-50 via-white to-sky-50 overflow-hidden transition-all duration-300 ease-out"
    >
      <div
        className="h-full w-full rounded-2xl border border-indigo-100 bg-white/80 backdrop-blur shadow-[0_10px_40px_rgba(15,23,42,0.08)] flex flex-col min-h-0 transition-all duration-300"
      >
        <div className="px-4 py-3 border-b border-gray-200 bg-white/95 text-gray-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-indigo-600">
                Task Board
              </p>
              <h1 className="text-xl font-semibold text-gray-900">
                {prettySelectedDate}
              </h1>
            </div>

            <div className="flex flex-col gap-2 lg:items-end">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full sm:w-72 bg-white text-gray-800 rounded-lg px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {isAdmin ? (
                  <button
                    onClick={() => {
                      if (showTaskForm) {
                        resetForm();
                        return;
                      }
                      openCreateTaskForm();
                    }}
                    className="whitespace-nowrap px-3 py-2 rounded-lg bg-indigo-600 text-(--white) text-sm font-medium hover:bg-indigo-700"
                  >
                    {showTaskForm ? "Close Task Form" : "Create New Task"}
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedDate(today)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm text-gray-700"
                >
                  Today
                </button>
                <button
                  onClick={() => moveByWeek(-7)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm text-gray-700"
                >
                  Prev Week
                </button>
                <button
                  onClick={() => moveByWeek(7)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-sm text-gray-700"
                >
                  Next Week
                </button>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && showTaskForm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <button
              type="button"
              aria-label="Close task form"
              onClick={resetForm}
              className="absolute inset-0 bg-slate-900/55 backdrop-blur-md"
            />

            <div className="relative z-10 w-full max-w-4xl rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.22)] border border-slate-200 overflow-hidden">
              <div className="flex items-start justify-between gap-4 px-6 pt-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-indigo-600">
                    Task Form
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    {editingTaskId ? "Edit Task" : "Add Task"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  aria-label="Close"
                >
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <div className="px-6 pb-6 pt-5">
                <div className="grid grid-cols-1 gap-3">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                      placeholder="Timeline"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    />
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    >
                      <option value="">Assign user</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      min={toDateTimeLocalValue(new Date())}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    />
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>

                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Task details / instructions"
                    rows={8}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={upsertTask}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-(--white) shadow-sm hover:bg-indigo-700"
                  >
                    {editingTaskId ? "Update Task" : "Add Task"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-4">
          <div
            key={`${selectedDate}-${weekTransitionDirection}`}
            className={`h-full min-w-[1024px] grid grid-cols-5 gap-3 animate-in fade-in duration-300 ${
              weekTransitionDirection > 0
                ? "slide-in-from-right-6"
                : weekTransitionDirection < 0
                  ? "slide-in-from-left-6"
                  : ""
            }`}
          >
            {weekDates.map((day) => {
              const dayTasks = boardSearchResults[day.dateKey] || [];
              return (
                <div
                  key={day.dateKey}
                  className={`h-full min-h-0 rounded-xl border overflow-visible ${
                    day.isToday
                      ? "border-indigo-400 bg-indigo-50/80 ring-1 ring-indigo-200"
                      : "border-gray-200 bg-white"
                  } flex flex-col`}
                >
                  <button
                    onClick={() => setSelectedDate(day.dateKey)}
                    className={`px-3 py-2 border-b text-left transition-colors ${
                      day.isToday ? "border-indigo-200 bg-indigo-50/80" : "border-gray-200"
                    }`}
                  >
                    <p
                      className={`text-xs uppercase tracking-wide ${
                        day.isToday ? "text-indigo-700 font-semibold" : "text-gray-500"
                      }`}
                    >
                      {day.dayLabel}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {day.dateLabel}
                    </p>
                    {day.isToday ? (
                      <p className="mt-1 inline-flex rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--white)">
                        Today
                      </p>
                    ) : null}
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {dayTasks.length} task{dayTasks.length === 1 ? "" : "s"}
                    </p>
                  </button>

                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-visible p-2 space-y-2">
                    {dayTasks.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[11px] text-gray-400">
                        No tasks
                      </div>
                    ) : (
                      dayTasks.map((task) => {
                        const instructionNote =
                          task.description?.trim() || "No details.";
                        const hasLongInstruction =
                          instructionNote.split(/\s+/).length > 18 ||
                          instructionNote.length > 120;

                        return (
                          <div
                            key={task.id}
                            className={`relative rounded-lg border p-2.5 bg-white shadow-sm ${getTaskBorder(task)}`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <h3 className="text-xs font-semibold text-gray-900 leading-tight">
                                {task.title}
                              </h3>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusMeta[task.status].chip}`}
                                >
                                  {statusMeta[task.status].label}
                                </span>
                                <details className="relative z-30">
                                  <summary
                                    aria-label="Task actions"
                                    className="list-none cursor-pointer rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-sm leading-none text-slate-700 hover:bg-slate-50"
                                  >
                                    ⋮
                                  </summary>
                                  <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-slate-200 bg-white p-2 shadow-2xl">
                                    <label className="text-[10px] font-medium text-slate-500">
                                      Status
                                    </label>
                                    <select
                                      value={task.status}
                                      onChange={(e) => {
                                        const nextStatus = e.target
                                          .value as TaskStatus;
                                        if (nextStatus === "COMPLETED") {
                                          const completionNote = window.prompt(
                                            "Add completion comment for this task (optional):",
                                            "",
                                          );
                                          updateTaskStatus(
                                            task.id,
                                            nextStatus,
                                            completionNote ?? "",
                                            day.dateKey,
                                          );
                                          return;
                                        }
                                        updateTaskStatus(
                                          task.id,
                                          nextStatus,
                                          undefined,
                                          day.dateKey,
                                        );
                                      }}
                                      disabled={
                                        !isAdmin &&
                                        currentUser?.id !== task.assignedTo
                                      }
                                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                                    >
                                      {statusFlow.map((statusOption) => {
                                        const isBackward =
                                          getStatusRank(statusOption) <
                                          getStatusRank(task.status);
                                        return (
                                          <option
                                            key={statusOption}
                                            value={statusOption}
                                            disabled={isBackward}
                                          >
                                            {statusMeta[statusOption].label}
                                          </option>
                                        );
                                      })}
                                    </select>
                                    <button
                                      onClick={() => {
                                        const quickComment = window.prompt(
                                          "Add a comment (optional):",
                                          "",
                                        );
                                        if (quickComment?.trim()) {
                                          addComment(
                                            task.id,
                                            quickComment,
                                            day.dateKey,
                                          );
                                        }
                                      }}
                                      className="mt-2 w-full rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100"
                                    >
                                      Add Comment
                                    </button>
                                    {isAdmin ? (
                                      <>
                                        <button
                                          onClick={() =>
                                            editTask(task, day.dateKey)
                                          }
                                          className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                                        >
                                          Edit Task
                                        </button>
                                        <button
                                          onClick={() =>
                                            deleteTask(task.id, day.dateKey)
                                          }
                                          className="mt-1.5 w-full rounded-md border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
                                        >
                                          Delete Task
                                        </button>
                                      </>
                                    ) : null}
                                  </div>
                                </details>
                              </div>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1 truncate">
                              {task.assignedToName}
                            </p>
                            <p className="text-[11px] text-gray-600 mt-1 line-clamp-2 break-words">
                              {instructionNote}
                            </p>
                            {hasLongInstruction ? (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-[10px] font-medium text-indigo-700 hover:text-indigo-900">
                                  View full note
                                </summary>
                                <p className="mt-1 rounded-md border border-indigo-100 bg-indigo-50/70 p-2 text-[11px] text-gray-700 break-words">
                                  {instructionNote}
                                </p>
                              </details>
                            ) : null}

                            <div className="mt-2 text-[10px] text-gray-500 space-y-0.5">
                              <p>
                                <span className="font-medium">Timeline:</span>{" "}
                                {task.timeline}
                              </p>
                              <p>
                                <span className="font-medium">Start:</span>{" "}
                                {new Date(task.startTime).toLocaleString()}
                              </p>
                              <p>
                                <span className="font-medium">Deadline:</span>{" "}
                                {new Date(task.deadline).toLocaleString()}
                              </p>
                            </div>

                            {task.comments.length > 0 ? (
                              <div className="mt-2 max-h-20 overflow-y-auto space-y-1 border border-slate-200 rounded-md bg-slate-50 p-1.5">
                                {task.comments.slice(-2).map((comment) => (
                                  <div
                                    key={comment.id}
                                    className="text-[10px] text-slate-700 break-words"
                                  >
                                    <span className="font-semibold">
                                      {comment.authorName}:
                                    </span>{" "}
                                    {comment.message}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
