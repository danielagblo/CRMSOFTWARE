'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'COMPLETED'

interface BoardUser {
  id: string
  name: string
  role?: string
}

interface TaskComment {
  id: string
  authorId: string
  authorName: string
  message: string
  createdAt: string
}

interface BoardTask {
  id: string
  title: string
  description: string
  assignedTo: string
  assignedToName: string
  startTime: string
  deadline: string
  timeline: string
  status: TaskStatus
  comments: TaskComment[]
  carriedOverFrom?: string
  createdAt: string
  updatedAt: string
}

type DailyTasks = Record<string, BoardTask[]>

const STORAGE_KEY = 'taskboard_daily_tasks_v1'
const statusFlow: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED']

const statusMeta: Record<TaskStatus, { label: string; chip: string; border: string }> = {
  PENDING: {
    label: 'Pending',
    chip: 'bg-slate-100 text-slate-700',
    border: 'border-slate-300'
  },
  IN_PROGRESS: {
    label: 'In Progress',
    chip: 'bg-cyan-100 text-cyan-700',
    border: 'border-cyan-300'
  },
  DELIVERED: {
    label: 'Delivered',
    chip: 'bg-indigo-100 text-indigo-700',
    border: 'border-indigo-300'
  },
  COMPLETED: {
    label: 'Completed',
    chip: 'bg-indigo-100 text-indigo-700',
    border: 'border-indigo-300'
  }
}

const toDateKey = (date: Date) => date.toISOString().slice(0, 10)
const fromDateKey = (dateKey: string) => new Date(`${dateKey}T00:00:00`)
const moveDateKey = (dateKey: string, amount: number) => {
  const next = fromDateKey(dateKey)
  next.setDate(next.getDate() + amount)
  return toDateKey(next)
}

const getStatusRank = (status: TaskStatus) => statusFlow.indexOf(status)

const parseTasks = (): DailyTasks => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as DailyTasks
  } catch {
    return {}
  }
}

const saveTasks = (tasks: DailyTasks) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

const createTaskId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const createCommentId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export default function TaskBoardPage() {
  const today = useMemo(() => toDateKey(new Date()), [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [users, setUsers] = useState<BoardUser[]>([])
  const [currentUser, setCurrentUser] = useState<BoardUser | null>(null)
  const [tasksByDate, setTasksByDate] = useState<DailyTasks>({})

  const [title, setTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [timeline, setTimeline] = useState('')
  const [startTime, setStartTime] = useState('')
  const [deadline, setDeadline] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [boardExpanded, setBoardExpanded] = useState(false)

  const isAdmin = currentUser?.role === 'ADMIN'

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as BoardUser
        setCurrentUser(parsed)
        setAssignedTo(parsed.id || '')
      } catch {
        setCurrentUser(null)
      }
    }

    const existing = parseTasks()
    setTasksByDate(existing)
  }, [])

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser?.id) return
      try {
        const response = await fetchWithAuth('/api/users')
        if (response.ok) {
          const data = (await response.json()) as BoardUser[]
          setUsers(data)
          if (!assignedTo && data.length > 0) {
            setAssignedTo(data[0].id)
          }
          return
        }
      } catch {
        // fallback to local user below
      }

      setUsers([{ id: currentUser.id, name: currentUser.name || 'Team Member', role: currentUser.role }])
      if (!assignedTo) {
        setAssignedTo(currentUser.id)
      }
    }

    fetchUsers()
  }, [currentUser, assignedTo])

  useEffect(() => {
    if (!currentUser) return

    setTasksByDate((prev) => {
      if (prev[selectedDate]) return prev

      const previousDateKey = moveDateKey(selectedDate, -1)
      const previousDayTasks = prev[previousDateKey] || []
      const carryOverTasks = previousDayTasks
        .filter((task) => task.status !== 'COMPLETED' && task.status !== 'DELIVERED')
        .map((task) => ({
          ...task,
          id: createTaskId(),
          comments: task.comments,
          carriedOverFrom: previousDateKey,
          updatedAt: new Date().toISOString()
        }))

      const nextState = {
        ...prev,
        [selectedDate]: carryOverTasks
      }
      saveTasks(nextState)
      return nextState
    })
  }, [selectedDate, currentUser])

  useEffect(() => {
    const autoStartTasks = () => {
      setTasksByDate((prev) => {
        const now = Date.now()
        let hasChanges = false
        const nextState: DailyTasks = {}

        for (const [dateKey, tasks] of Object.entries(prev)) {
          let changedInDay = false
          const updatedTasks = tasks.map((task) => {
            if (task.status !== 'PENDING') return task
            const startAt = new Date(task.startTime).getTime()
            if (Number.isNaN(startAt) || startAt > now) return task

            changedInDay = true
            return {
              ...task,
              status: 'IN_PROGRESS' as TaskStatus,
              updatedAt: new Date().toISOString()
            }
          })

          nextState[dateKey] = changedInDay ? updatedTasks : tasks
          if (changedInDay) hasChanges = true
        }

        if (!hasChanges) return prev
        saveTasks(nextState)
        return nextState
      })
    }

    autoStartTasks()
    const intervalId = window.setInterval(autoStartTasks, 30000)
    return () => window.clearInterval(intervalId)
  }, [])

  const weekDates = useMemo(() => {
    const anchor = fromDateKey(selectedDate)
    const day = anchor.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    anchor.setDate(anchor.getDate() + mondayOffset)

    return Array.from({ length: 5 }).map((_, index) => {
      const date = new Date(anchor)
      date.setDate(anchor.getDate() + index)
      const dateKey = toDateKey(date)
      return {
        dateKey,
        dayLabel: date.toLocaleDateString(undefined, { weekday: 'short' }),
        dateLabel: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        isToday: dateKey === today,
        isSelected: dateKey === selectedDate
      }
    })
  }, [selectedDate, today])

  const visibleTasksByDate = useMemo(() => {
    const result: Record<string, BoardTask[]> = {}
    weekDates.forEach(({ dateKey }) => {
      const dayTasks = tasksByDate[dateKey] || []
      result[dateKey] = isAdmin
        ? dayTasks
        : dayTasks.filter((task) => task.assignedTo === currentUser?.id)
    })
    return result
  }, [tasksByDate, weekDates, isAdmin, currentUser])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setTimeline('')
    setStartTime('')
    setDeadline('')
    setEditingTaskId(null)
  }

  const upsertTask = () => {
    if (!currentUser || !title.trim() || !assignedTo || !startTime || !deadline || !timeline.trim()) {
      alert('Please complete task title, assigned user, timeline, start time, and deadline.')
      return
    }

    const assignedUser = users.find((user) => user.id === assignedTo)
    const now = new Date().toISOString()

    setTasksByDate((prev) => {
      const dailyTasks = [...(prev[selectedDate] || [])]
      if (editingTaskId) {
        const index = dailyTasks.findIndex((task) => task.id === editingTaskId)
        if (index >= 0) {
          dailyTasks[index] = {
            ...dailyTasks[index],
            title: title.trim(),
            description: description.trim(),
            assignedTo,
            assignedToName: assignedUser?.name || 'Unknown User',
            timeline: timeline.trim(),
            startTime,
            deadline,
            updatedAt: now
          }
        }
      } else {
        dailyTasks.unshift({
          id: createTaskId(),
          title: title.trim(),
          description: description.trim(),
          assignedTo,
          assignedToName: assignedUser?.name || 'Unknown User',
          timeline: timeline.trim(),
          startTime,
          deadline,
          status: 'PENDING',
          comments: [],
          createdAt: now,
          updatedAt: now
        })
      }

      const next = { ...prev, [selectedDate]: dailyTasks }
      saveTasks(next)
      return next
    })

    resetForm()
  }

  const editTask = (task: BoardTask, dateKey: string) => {
    setSelectedDate(dateKey)
    setEditingTaskId(task.id)
    setTitle(task.title)
    setDescription(task.description)
    setAssignedTo(task.assignedTo)
    setTimeline(task.timeline)
    setStartTime(task.startTime)
    setDeadline(task.deadline)
  }

  const deleteTask = (taskId: string, dateKey: string) => {
    if (!currentUser || !isAdmin) return
    const confirmed = window.confirm('Delete this task permanently?')
    if (!confirmed) return

    setTasksByDate((prev) => {
      const dailyTasks = prev[dateKey] || []
      const nextDailyTasks = dailyTasks.filter((task) => task.id !== taskId)
      if (nextDailyTasks.length === dailyTasks.length) return prev

      const next = { ...prev, [dateKey]: nextDailyTasks }
      saveTasks(next)
      return next
    })

    if (editingTaskId === taskId) {
      resetForm()
    }
  }

  const appendCommentToTask = (task: BoardTask, message: string): BoardTask => {
    if (!currentUser || !message.trim()) return task
    return {
      ...task,
      comments: [
        ...task.comments,
        {
          id: createCommentId(),
          authorId: currentUser.id,
          authorName: currentUser.name || 'Team Member',
          message: message.trim(),
          createdAt: new Date().toISOString()
        }
      ],
      updatedAt: new Date().toISOString()
    }
  }

  const updateTaskStatus = (taskId: string, status: TaskStatus, completionComment?: string, dateKey = selectedDate) => {
    if (!currentUser) return
    setTasksByDate((prev) => {
      const dailyTasks = [...(prev[dateKey] || [])]
      const index = dailyTasks.findIndex((task) => task.id === taskId)
      if (index < 0) return prev

      const task = dailyTasks[index]
      if (!isAdmin && task.assignedTo !== currentUser.id) return prev
      const currentRank = getStatusRank(task.status)
      const nextRank = getStatusRank(status)

      // Enforce irreversible status progression (forward only).
      if (nextRank < currentRank) {
        alert('Status updates are irreversible. You can only move a task forward.')
        return prev
      }

      let updatedTask: BoardTask = {
        ...task,
        status,
        updatedAt: new Date().toISOString()
      }
      if (status === 'COMPLETED' && completionComment?.trim()) {
        updatedTask = appendCommentToTask(updatedTask, `Completion note: ${completionComment.trim()}`)
      }

      dailyTasks[index] = updatedTask
      const next = { ...prev, [dateKey]: dailyTasks }
      saveTasks(next)
      return next
    })
  }

  const addComment = (taskId: string, message: string, dateKey = selectedDate) => {
    if (!currentUser) return
    const nextMessage = message.trim()
    if (!nextMessage) return

    setTasksByDate((prev) => {
      const dailyTasks = [...(prev[dateKey] || [])]
      const index = dailyTasks.findIndex((task) => task.id === taskId)
      if (index < 0) return prev

      const task = dailyTasks[index]
      dailyTasks[index] = appendCommentToTask(task, nextMessage)

      const next = { ...prev, [dateKey]: dailyTasks }
      saveTasks(next)
      return next
    })
  }

  const getTaskBorder = (task: BoardTask) => {
    const deadlineAt = new Date(task.deadline)
    const overdue = task.status !== 'COMPLETED' && !Number.isNaN(deadlineAt.getTime()) && deadlineAt < new Date()
    if (overdue) return 'border-red-300'
    return statusMeta[task.status].border
  }

  const prettySelectedDate = useMemo(() => {
    const parsed = fromDateKey(selectedDate)
    return parsed.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, [selectedDate])

  const boardSearchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return visibleTasksByDate
    const filtered: Record<string, BoardTask[]> = {}
    Object.entries(visibleTasksByDate).forEach(([dateKey, tasks]) => {
      filtered[dateKey] = tasks.filter((task) => {
        const searchable = `${task.title} ${task.description} ${task.assignedToName} ${task.timeline}`.toLowerCase()
        return searchable.includes(query)
      })
    })
    return filtered
  }, [visibleTasksByDate, searchQuery])

  return (
    <div className={`${boardExpanded ? 'fixed inset-0 z-40' : 'h-[calc(100vh-4rem)]'} bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-3 sm:p-4 overflow-hidden`}>
      <div className="h-full w-full rounded-2xl border border-indigo-100 bg-white/80 backdrop-blur shadow-[0_10px_40px_rgba(15,23,42,0.08)] flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-600 to-sky-600 text-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-indigo-100">Task Board</p>
              <h1 className="text-xl font-semibold">{prettySelectedDate}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBoardExpanded((prev) => !prev)}
                className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 text-sm"
              >
                {boardExpanded ? 'Collapse' : 'Expand'}
              </button>
              <button
                onClick={() => setSelectedDate(today)}
                className="px-3 py-1.5 rounded-lg bg-white text-indigo-700 text-sm font-medium"
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDate((prev) => moveDateKey(prev, -7))}
                className="px-2 py-1 rounded-md bg-white/15 border border-white/30 text-sm"
              >
                Prev Week
              </button>
              <button
                onClick={() => setSelectedDate((prev) => moveDateKey(prev, 7))}
                className="px-2 py-1 rounded-md bg-white/15 border border-white/30 text-sm"
              >
                Next Week
              </button>
            </div>
          </div>
          <div className="mt-3">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by title, timeline, assignee..."
              className="w-full bg-white/95 text-gray-800 rounded-xl px-4 py-2.5 border border-white/40 focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>
        </div>

        {isAdmin && (
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="Timeline"
                className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Assign user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={upsertTask}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {editingTaskId ? 'Update' : 'Add'}
              </button>
              {editingTaskId ? (
                <button
                  onClick={resetForm}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              ) : null}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task details / instructions"
              rows={2}
              className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-4">
          <div className="h-full min-w-[1024px] grid grid-cols-5 gap-3">
            {weekDates.map((day) => {
              const dayTasks = boardSearchResults[day.dateKey] || []
              return (
                <div key={day.dateKey} className={`h-full min-h-0 rounded-xl border ${
                  day.isSelected ? 'border-indigo-300 bg-indigo-50/60' : 'border-gray-200 bg-white'
                } flex flex-col`}>
                  <button
                    onClick={() => setSelectedDate(day.dateKey)}
                    className="px-3 py-2 border-b border-gray-200 text-left"
                  >
                    <p className={`text-xs uppercase tracking-wide ${day.isToday ? 'text-indigo-600 font-semibold' : 'text-gray-500'}`}>
                      {day.dayLabel}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">{day.dateLabel}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{dayTasks.length} task{dayTasks.length === 1 ? '' : 's'}</p>
                  </button>

                  <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                    {dayTasks.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[11px] text-gray-400">No tasks</div>
                    ) : (
                      dayTasks.map((task) => (
                        <div key={task.id} className={`rounded-lg border p-2.5 bg-white shadow-sm ${getTaskBorder(task)}`}>
                          <div className="flex items-start justify-between gap-1.5">
                            <h3 className="text-xs font-semibold text-gray-900 leading-tight">{task.title}</h3>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusMeta[task.status].chip}`}>
                                {statusMeta[task.status].label}
                              </span>
                              <details className="relative">
                                <summary
                                  aria-label="Task actions"
                                  className="list-none cursor-pointer rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-sm leading-none text-slate-700 hover:bg-slate-50"
                                >
                                  ⋮
                                </summary>
                                <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                                  <label className="text-[10px] font-medium text-slate-500">Status</label>
                                  <select
                                    value={task.status}
                                    onChange={(e) => {
                                      const nextStatus = e.target.value as TaskStatus
                                      if (nextStatus === 'COMPLETED') {
                                        const completionNote = window.prompt('Add completion comment for this task (optional):', '')
                                        updateTaskStatus(task.id, nextStatus, completionNote ?? '', day.dateKey)
                                        return
                                      }
                                      updateTaskStatus(task.id, nextStatus, undefined, day.dateKey)
                                    }}
                                    disabled={!isAdmin && currentUser?.id !== task.assignedTo}
                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                                  >
                                    {statusFlow.map((statusOption) => {
                                      const isBackward = getStatusRank(statusOption) < getStatusRank(task.status)
                                      return (
                                        <option key={statusOption} value={statusOption} disabled={isBackward}>
                                          {statusMeta[statusOption].label}
                                        </option>
                                      )
                                    })}
                                  </select>
                                  <button
                                    onClick={() => {
                                      const quickComment = window.prompt('Add a comment (optional):', '')
                                      if (quickComment?.trim()) {
                                        addComment(task.id, quickComment, day.dateKey)
                                      }
                                    }}
                                    className="mt-2 w-full rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100"
                                  >
                                    Add Comment
                                  </button>
                                  {isAdmin ? (
                                    <>
                                      <button
                                        onClick={() => editTask(task, day.dateKey)}
                                        className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                                      >
                                        Edit Task
                                      </button>
                                      <button
                                        onClick={() => deleteTask(task.id, day.dateKey)}
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
                          <p className="text-[11px] text-gray-500 mt-1 truncate">{task.assignedToName}</p>
                          <p className="text-[11px] text-gray-600 mt-1 line-clamp-2 break-words">{task.description || 'No details.'}</p>

                          <div className="mt-2 text-[10px] text-gray-500 space-y-0.5">
                            <p><span className="font-medium">Timeline:</span> {task.timeline}</p>
                            <p><span className="font-medium">Start:</span> {new Date(task.startTime).toLocaleString()}</p>
                            <p><span className="font-medium">Deadline:</span> {new Date(task.deadline).toLocaleString()}</p>
                          </div>

                          {task.comments.length > 0 ? (
                            <div className="mt-2 max-h-20 overflow-y-auto space-y-1 border border-slate-200 rounded-md bg-slate-50 p-1.5">
                              {task.comments.slice(-2).map((comment) => (
                                <div key={comment.id} className="text-[10px] text-slate-700 break-words">
                                  <span className="font-semibold">{comment.authorName}:</span> {comment.message}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
