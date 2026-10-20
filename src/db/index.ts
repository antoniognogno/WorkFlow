import Dexie, { Table } from 'dexie'

export interface LocalJob {
  id: string
  name: string
  client: string
  rate: number
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
  synced: boolean
  updatedAt: string
}

class AppDatabase extends Dexie {
  jobs!: Table<LocalJob, string>
  presets!: Table<LocalPreset, string>
  entries!: Table<LocalEntry, string>

  constructor() {
    super('OreEPagaDB')
    this.version(1).stores({
      jobs: 'id, name, client, synced',
      presets: 'id, jobId, synced',
      entries: 'id, jobId, date, paid, synced',
    })
  }
}

export const db = new AppDatabase()