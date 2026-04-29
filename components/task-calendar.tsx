'use client';

import { useMemo, useState, useTransition } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { CheckCircle2, Circle, Clock3, Plus, Trash2 } from 'lucide-react';

import { cn, formatUrgencyLabel } from '@/lib/utils';

type TaskItem = {
  id: string;
  title: string;
  dueDate: string;
  dueTime: string | null;
  urgency: 'NORMAL' | 'IMPORTANT' | 'DEADLINE';
  completed: boolean;
};

type Props = {
  initialTasks: TaskItem[];
};

const urgencyOptions = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'IMPORTANT', label: 'Important' },
  { value: 'DEADLINE', label: 'Deadline' },
] as const;

export function TaskCalendar({ initialTasks }: Props) {
  const [selected, setSelected] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [title, setTitle] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [urgency, setUrgency] = useState<TaskItem['urgency']>('NORMAL');
  const [isPending, startTransition] = useTransition();

  const selectedKey = format(selected, 'yyyy-MM-dd');

  const selectedTasks = useMemo(
    () => tasks.filter((task) => task.dueDate === selectedKey).sort((a, b) => Number(a.completed) - Number(b.completed)),
    [tasks, selectedKey],
  );

  const modifiers = useMemo(() => {
    const dates = initialTasks.map((task) => new Date(`${task.dueDate}T12:00:00`));
    return { hasTask: dates };
  }, [initialTasks]);

  async function createTask() {
    const payload = {
      title: title.trim(),
      dueDate: selectedKey,
      dueTime,
      urgency,
    };

    if (!payload.title) return;

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { ok: boolean; task?: TaskItem };
    if (data.ok && data.task) {
      setTasks((current) => [
        ...current,
        {
          ...data.task,
          dueDate: data.task.dueDate.slice(0, 10),
        },
      ]);
      setTitle('');
      setDueTime('');
      setUrgency('NORMAL');
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(() => {
      void createTask();
    });
  }

  function toggleTask(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/tasks/${id}/toggle`, { method: 'POST' });
      const data = (await response.json()) as { ok: boolean; task?: TaskItem };
      if (data.ok && data.task) {
        setTasks((current) =>
          current.map((task) =>
            task.id === id
              ? {
                  ...task,
                  completed: data.task!.completed,
                }
              : task,
          ),
        );
      }
    });
  }

  function deleteTask(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/tasks/${id}/delete`, { method: 'DELETE' });
      const data = (await response.json()) as { ok: boolean };
      if (data.ok) {
        setTasks((current) => current.filter((task) => task.id !== id));
      }
    });
  }

  return (
    <section className="dashboard-grid">
      <div className="glass-card calendar-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Calendar</p>
            <h2>Pick a day</h2>
          </div>
        </div>
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={(day) => day && setSelected(day)}
          modifiers={modifiers}
          modifiersClassNames={{ hasTask: 'day-has-task' }}
        />
      </div>

      <div className="glass-card planner-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Selected date</p>
            <h2>{format(selected, 'EEEE, MMMM d')}</h2>
          </div>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <div className="task-input-row">
            <input
              className="task-input"
              placeholder="What to do"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <button className="icon-btn" type="submit" disabled={isPending} aria-label="Add task">
              <Plus size={18} />
            </button>
          </div>

          <div className="field-row">
            <label>
              <span>Urgency</span>
              <select value={urgency} onChange={(event) => setUrgency(event.target.value as TaskItem['urgency'])}>
                {urgencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Time</span>
              <input type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} />
            </label>
          </div>
        </form>

        <div className="task-list">
          {selectedTasks.length ? (
            selectedTasks.map((task) => (
              <article key={task.id} className={cn('task-item', task.completed && 'task-item-complete')}>
                <button className="task-toggle" type="button" onClick={() => toggleTask(task.id)}>
                  {task.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </button>

                <button className="task-content" type="button" onClick={() => toggleTask(task.id)}>
                  <span className="task-title">{task.title}</span>
                  <span className="task-meta-row">
                    <span className={`urgency-pill urgency-${task.urgency.toLowerCase()}`}>{formatUrgencyLabel(task.urgency)}</span>
                    {task.dueTime ? (
                      <span className="time-pill">
                        <Clock3 size={14} /> {task.dueTime}
                      </span>
                    ) : null}
                  </span>
                </button>

                <button className="ghost-icon-btn" type="button" onClick={() => deleteTask(task.id)} aria-label="Delete task">
                  <Trash2 size={16} />
                </button>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <p>No tasks for this date yet.</p>
              <span>Add one with the input above.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
