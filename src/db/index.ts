import Dexie from 'dexie'
import type { Table } from 'dexie'

export interface LocalJob {
  id: string
  name: string
  client: string
  rate: number
  overtimeEnabled: boolean
  overtimeMultiplier: number
  color: string
  synced: boolean
  updatedAt: string
}

export interface LocalPreset {
  id: string
  jobId: string
  startTime: string
  endTime: string
  synced: boolean
}

export interface LocalEntry {
  id: string
  jobId: string
  date: string
  startTime: string
  endTime: string
  minutes: number
  rate: number
  paid: boolean
  paidAt: string | null
  paymentMethod: string | null
  paymentNote: string | null
  breakMinutes: number
  overtimeMinutes: number
  overtimeRate: number
  deletedAt: string | null
  synced: boolean
  updatedAt: string
}

export interface MutationQueueItem {
  id: string
  operation: string
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
}

class AppDatabase extends Dexie {
  jobs!: Table<LocalJob, string>
  presets!: Table<LocalPreset, string>
  entries!: Table<LocalEntry, string>
  mutations!: Table<MutationQueueItem, string>

  constructor() {
    super('OreEPagaDB')
    this.version(1).stores({
      jobs: 'id, name, client, synced',
      presets: 'id, jobId, synced',
      entries: 'id, jobId, date, paid, synced',
    })
    this.version(2).stores({
      jobs: 'id, name, client, synced',
      presets: 'id, jobId, synced',
      entries: 'id, jobId, date, paid, synced',
      mutations: 'id, operation, createdAt',
    })
  }
}

export const db = new AppDatabase()