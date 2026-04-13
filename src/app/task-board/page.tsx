'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'COMPLETED'
type GroupMode = 'user' | 'flat'

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

const statusMeta: Record<TaskStatus, { label: string; chip: string; border: string }> = {
  PENDING: {
    label: 'Pending',
    chip: 'bg-amber-100 text-amber-700',
    border: 'border-amber-300'
  },
  IN_PROGRESS: {
    label: 'In Progress',
    chip: 'bg-blue-100 text-blue-700',
    border: 'border-blue-300'
  },
  DELIVERED: {
    label: 'Delivered',
    chip: 'bg-violet-100 text-violet-700',
    border: 'border-violet-300'
  },
  COMPLETED: {
    label: 'Completed',
    chip: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-300'
  }
}

const toDateKey = (date: Date) => date.toISOString().slice(0, 10)
const fromDateKey = (dateKey: string) => new Date(`${dateKey}T00:00:00`)
const moveDateKey = (dateKey: string, amount: number) => {
  const next = fromDateKey(dateKey)
  next.setDate(next.getDate() + amount)
  return toDateKey(next)
}

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
  const [groupMode, setGroupMode] = useState<GroupMode>('user')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [timeline, setTimeline] = useState('')
  const [startTime, setStartTime] = useState('')
  const [deadline, setDeadline] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
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

  const selectedDateTasks = tasksByDate[selectedDate] || []
  const visibleTasks = useMemo(() => {
    if (isAdmin) return selectedDateTasks
    if (!currentUser?.id) return []
    return selectedDateTasks.filter((task) => task.assignedTo === currentUser.id)
  }, [selectedDateTasks, isAdmin, currentUser])

  const groupedTasks = useMemo(() => {
    if (groupMode === 'flat') {
      return [{ label: 'All Tasks', tasks: visibleTasks }]
    }

    const byUser = new Map<string, BoardTask[]>()
    visibleTasks.forEach((task) => {
      const key = task.assignedToName || 'Unassigned'
      const existing = byUser.get(key) || []
      existing.push(task)
      byUser.set(key, existing)
    })

    return Array.from(byUser.entries()).map(([label, tasks]) => ({ label, tasks }))
  }, [visibleTasks, groupMode])

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

  const editTask = (task: BoardTask) => {
    setEditingTaskId(task.id)
    setTitle(task.title)
    setDescription(task.description)
    setAssignedTo(task.assignedTo)
    setTimeline(task.timeline)
    setStartTime(task.startTime)
    setDeadline(task.deadline)
  }

  const updateTaskStatus = (taskId: string, status: TaskStatus, completionComment?: string) => {
    if (!currentUser) return
    setTasksByDate((prev) => {
      const dailyTasks = [...(prev[selectedDate] || [])]
      const index = dailyTasks.findIndex((task) => task.id === taskId)
      if (index < 0) return prev

      const task = dailyTasks[index]
      if (!isAdmin && task.assignedTo !== currentUser.id) return prev

      const updatedComments = [...task.comments]
      if (status === 'COMPLETED' && completionComment?.trim()) {
        updatedComments.push({
          id: createCommentId(),
          authorId: currentUser.id,
          authorName: currentUser.name || 'Team Member',
          message: `Completion note: ${completionComment.trim()}`,
          createdAt: new Date().toISOString()
        })
      }

      dailyTasks[index] = {
        ...task,
        status,
        comments: updatedComments,
        updatedAt: new Date().toISOString()
      }
      const next = { ...prev, [selectedDate]: dailyTasks }
      saveTasks(next)
      return next
    })
  }

  const addComment = (taskId: string) => {
    if (!currentUser) return
    const message = (commentDrafts[taskId] || '').trim()
    if (!message) return

    setTasksByDate((prev) => {
      const dailyTasks = [...(prev[selectedDate] || [])]
      const index = dailyTasks.findIndex((task) => task.id === taskId)
      if (index < 0) return prev

      const task = dailyTasks[index]
      dailyTasks[index] = {
        ...task,
        comments: [
          ...task.comments,
          {
            id: createCommentId(),
            authorId: currentUser.id,
            authorName: currentUser.name || 'Team Member',
            message,
            createdAt: new Date().toISOString()
          }
        ],
        updatedAt: new Date().toISOString()
      }

      const next = { ...prev, [selectedDate]: dailyTasks }
      saveTasks(next)
      return next
    })

    setCommentDrafts((prev) => ({ ...prev, [taskId]: '' }))
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

  const taskSummary = useMemo(() => {
    const summary = { total: visibleTasks.length, pending: 0, progress: 0, delivered: 0, completed: 0 }
    visibleTasks.forEach((task) => {
      if (task.status === 'PENDING') summary.pending += 1
      if (task.status === 'IN_PROGRESS') summary.progress += 1
      if (task.status === 'DELIVERED') summary.delivered += 1
      if (task.status === 'COMPLETED') summary.completed += 1
    })
    return summary
  }, [visibleTasks])

  return (
    <div className={`${boardExpanded ? 'fixed inset-0 z-40' : 'h-[calc(100vh-4rem)]'} bg-gray-50 p-3 sm:p-4 overflow-hidden`}>
      <div className="h-full w-full rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col min-h-0">
        <div className="border-b border-gray-200 px-4 py-3 bg-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold text-indigo-600">Task Board</p>
              <h1 className="text-xl font-bold text-gray-900">{prettySelectedDate}</h1>
              <p className="text-sm text-gray-600">Daily activities and collaboration for all team members.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBoardExpanded((prev) => !prev)}
                className="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 text-sm"
              >
                {boardExpanded ? 'Collapse Board' : 'Expand Board'}
              </button>
              <button
                onClick={() => setSelectedDate(today)}
                className="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 text-sm"
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDate((prev) => moveDateKey(prev, -1))}
                className="px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-100 text-gray-700"
              >
                Prev
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => setSelectedDate((prev) => moveDateKey(prev, 1))}
                className="px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-100 text-gray-700"
              >
                Next
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
              <p className="text-[11px] text-gray-500">Total</p>
              <p className="text-base font-semibold text-gray-900">{taskSummary.total}</p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
              <p className="text-[11px] text-amber-700">Pending</p>
              <p className="text-base font-semibold text-amber-800">{taskSummary.pending}</p>
            </div>
            <div className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5">
              <p className="text-[11px] text-blue-700">In Progress</p>
              <p className="text-base font-semibold text-blue-800">{taskSummary.progress}</p>
            </div>
            <div className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5">
              <p className="text-[11px] text-violet-700">Delivered</p>
              <p className="text-base font-semibold text-violet-800">{taskSummary.delivered}</p>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5">
              <p className="text-[11px] text-emerald-700">Completed</p>
              <p className="text-base font-semibold text-emerald-800">{taskSummary.completed}</p>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-white">
          <div>
            <p className="text-sm font-medium text-gray-900">Tasks for {prettySelectedDate}</p>
            <p className="text-xs text-gray-500">Track progress, update status, and collaborate with comments.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Group:</span>
            <button
              onClick={() => setGroupMode('user')}
              className={`px-3 py-1.5 rounded-lg text-sm border ${groupMode === 'user' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700'}`}
            >
              By User
            </button>
            <button
              onClick={() => setGroupMode('flat')}
              className={`px-3 py-1.5 rounded-lg text-sm border ${groupMode === 'flat' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700'}`}
            >
              Flat
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="px-4 py-3 border-b border-gray-200 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="Timeline (e.g. API handoff)"
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
              <div className="flex gap-2">
                <button
                  onClick={upsertTask}
                  className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {editingTaskId ? 'Update Task' : 'Add Task'}
                </button>
                {editingTaskId && (
                  <button
                    onClick={resetForm}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white"
                  >
                    Cancel
                  </button>
                )}
              </div>
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

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {groupedTasks.length === 0 || groupedTasks.every((group) => group.tasks.length === 0) ? (
            <div className="text-center text-gray-500 py-12">No tasks for this date.</div>
          ) : (
            groupedTasks.map((group) => (
              <div key={group.label} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">{group.label}</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
                  {group.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`rounded-lg border p-3 bg-white shadow-sm hover:shadow transition-all ${getTaskBorder(task)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 leading-tight text-sm">{task.title}</h3>
                          <p className="text-[11px] text-gray-500 mt-0.5">Assigned: {task.assignedToName}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusMeta[task.status].chip}`}>
                          {statusMeta[task.status].label}
                        </span>
                      </div>

                      <p className="text-xs text-gray-700 mt-2 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 max-h-16 overflow-y-auto">
                        {task.description || 'No task details provided.'}
                      </p>

                      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                        <div className="rounded-md bg-gray-50 p-2 border border-gray-200">
                          <p className="text-gray-500 uppercase tracking-wide text-[10px]">Timeline</p>
                          <p className="font-semibold text-gray-800">{task.timeline}</p>
                        </div>
                        <div className="rounded-md bg-gray-50 p-2 border border-gray-200">
                          <p className="text-gray-500 uppercase tracking-wide text-[10px]">Start</p>
                          <p className="font-semibold text-gray-800">{new Date(task.startTime).toLocaleString()}</p>
                        </div>
                        <div className="rounded-md bg-gray-50 p-2 border border-gray-200">
                          <p className="text-gray-500 uppercase tracking-wide text-[10px]">Deadline</p>
                          <p className="font-semibold text-gray-800">{new Date(task.deadline).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <select
                          value={task.status}
                          onChange={(e) => {
                            const nextStatus = e.target.value as TaskStatus
                            if (nextStatus === 'COMPLETED') {
                              const completionNote = window.prompt('Add completion comment for this task (optional):', '')
                              updateTaskStatus(task.id, nextStatus, completionNote ?? '')
                              return
                            }
                            updateTaskStatus(task.id, nextStatus)
                          }}
                          disabled={!isAdmin && currentUser?.id !== task.assignedTo}
                          className="px-2 py-1.5 rounded-md border border-gray-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="COMPLETED">Completed</option>
                        </select>

                        {isAdmin && (
                          <button
                            onClick={() => editTask(task)}
                            className="px-2 py-1.5 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50"
                          >
                            Edit Task
                          </button>
                        )}
                      </div>

                      {task.comments.length > 0 && (
                        <div className="mt-2.5 space-y-1.5 border-t border-gray-200 pt-2.5 max-h-28 overflow-y-auto">
                          {task.comments.map((comment) => (
                            <div key={comment.id} className="text-xs bg-gray-50 border border-gray-200 rounded-md p-2">
                              <p className="font-medium text-gray-700">
                                {comment.authorName}{' '}
                                <span className="font-normal text-gray-500">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </span>
                              </p>
                              <p className="text-gray-700 mt-1">{comment.message}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-2.5 flex gap-1.5">
                        <input
                          value={commentDrafts[task.id] || ''}
                          onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [task.id]: e.target.value }))}
                          placeholder="Add comment"
                          className="flex-1 px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => addComment(task.id)}
                          className="px-2.5 py-1.5 rounded-md bg-indigo-600 text-white text-xs hover:bg-indigo-700"
                        >
                          Comment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}
