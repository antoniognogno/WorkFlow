export interface WorkGoals {
  monthlyHours: number
  monthlyEarnings: number
  weeklyHours: number
  jobMonthlyEarnings: Record<string, number>
}

export const defaultGoals: WorkGoals = {
  monthlyHours: 50,
  monthlyEarnings: 500,
  weeklyHours: 12,
  jobMonthlyEarnings: {},
}

export const goalsStorageKey = 'workflow-goals'

export const loadGoals = (): WorkGoals => {
  try {
    const stored = JSON.parse(localStorage.getItem(goalsStorageKey) || '{}') as Partial<WorkGoals>
    return {
      monthlyHours: Number(stored.monthlyHours ?? defaultGoals.monthlyHours),
      monthlyEarnings: Number(stored.monthlyEarnings ?? defaultGoals.monthlyEarnings),
      weeklyHours: Number(stored.weeklyHours ?? defaultGoals.weeklyHours),
      jobMonthlyEarnings: stored.jobMonthlyEarnings && typeof stored.jobMonthlyEarnings === 'object'
        ? stored.jobMonthlyEarnings
        : {},
    }
  } catch {
    return { ...defaultGoals, jobMonthlyEarnings: {} }
  }
}

export const saveGoals = (goals: WorkGoals) => {
  localStorage.setItem(goalsStorageKey, JSON.stringify(goals))
}
