import { supabase } from '@/lib/supabase'
import { db, type MutationQueueItem } from '@/db'

export const queueMutation = async (operation: string, payload: Record<string, unknown>) => {
  const item: MutationQueueItem = {
    id: crypto.randomUUID(),
    operation,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await db.mutations.add(item)
  return item
}

export const pendingMutationsCount = () => db.mutations.count()

export const syncPendingMutations = async (): Promise<number> => {
  if (!navigator.onLine) return db.mutations.count()

  const items = await db.mutations.orderBy('createdAt').toArray()
  let synced = 0

  for (const item of items) {
    const { operation, payload } = item
    let result: { error: { message: string } | null } | null = null

    try {
      switch (operation) {
        case 'createJob':
          result = await supabase.from('jobs').insert(payload)
          break
        case 'updateJob':
          result = await supabase.from('jobs').update(payload.values as Record<string, unknown>).eq('id', String(payload.id))
          break
        case 'deleteJob':
          result = await supabase.from('jobs').delete().eq('id', String(payload.id))
          break
        case 'addPreset':
          result = await supabase.from('presets').insert(payload)
          break
        case 'deletePreset':
          result = await supabase.from('presets').delete().eq('id', String(payload.id))
          break
        case 'addEntry':
          result = await supabase.from('entries').insert(payload)
          break
        case 'updateEntry':
          result = payload.applyToJobEntries
            ? await supabase.from('entries').update(payload.values as Record<string, unknown>).eq('job_id', String(payload.jobId))
            : await supabase.from('entries').update(payload.values as Record<string, unknown>).eq('id', String(payload.id))
          break
        case 'deleteEntry':
          result = await supabase.from('entries').update({ deleted_at: payload.deleted_at }).eq('id', String(payload.id))
          break
        case 'restoreEntry':
          result = await supabase.from('entries').update({ deleted_at: null }).eq('id', String(payload.id))
          break
        case 'permanentlyDeleteEntry':
          result = await supabase.from('entries').delete().eq('id', String(payload.id))
          break
        case 'markEntriesPaid':
          result = await supabase.from('entries').update(payload.values as Record<string, unknown>).in('id', payload.ids as string[])
          break
        case 'updatePayment':
          result = await supabase.from('entries').update(payload.values as Record<string, unknown>).eq('id', String(payload.id))
          break
        case 'cancelPayment':
          result = await supabase.from('entries').update({ paid: false, paid_at: null, payment_method: null, payment_note: null }).eq('id', String(payload.id))
          break
      }

      if (!result || result.error) break
      await db.mutations.delete(item.id)
      synced += 1
    } catch {
      break
    }
  }

  return synced
}
