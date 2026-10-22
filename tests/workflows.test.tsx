import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JobsView } from '@/components/jobs/JobsView'
import { RegisterView } from '@/components/register/RegisterView'
import { PaymentsView } from '@/components/payments/PaymentsView'

const job = {
  id: 'job-1',
  name: 'Babysitter',
  client: 'Martina',
  rate: 15,
  overtimeEnabled: false,
  overtimeMultiplier: 1.5,
  presets: [],
}

const entry = {
  id: 'entry-1',
  jobId: job.id,
  date: new Date().toISOString().slice(0, 10),
  start: '16:00',
  end: '18:00',
  minutes: 120,
  rate: 15,
  paid: false,
  paidAt: null,
  paymentMethod: null,
  paymentNote: null,
  breakMinutes: 0,
  overtimeMinutes: 0,
  overtimeRate: 15,
}

const noopAsync = async () => {}

describe('main user workflows', () => {
  it('creates a job with its client and hourly rate', async () => {
    const user = userEvent.setup()
    const onCreateJob = vi.fn().mockResolvedValue(undefined)

    render(<JobsView jobs={[]} onCreateJob={onCreateJob} onUpdateJob={noopAsync} onDeleteJob={noopAsync} onAddPreset={noopAsync} onDeletePreset={noopAsync} />)
    await user.type(screen.getByPlaceholderText('Nome (es. Ripetizioni)'), 'Pattinaggio')
    await user.type(screen.getByPlaceholderText('Cliente'), 'ASD Pieris')
    await user.type(screen.getByPlaceholderText('Tariffa €/ora'), '10')
    await user.click(screen.getByRole('button', { name: 'Crea' }))

    expect(onCreateJob).toHaveBeenCalledWith('Pattinaggio', 'ASD Pieris', 10, false, 1.5)
  })

  it('edits a job without applying changes to historical entries', async () => {
    const user = userEvent.setup()
    const onUpdateJob = vi.fn().mockResolvedValue(undefined)

    render(<JobsView jobs={[job]} onCreateJob={noopAsync} onUpdateJob={onUpdateJob} onDeleteJob={noopAsync} onAddPreset={noopAsync} onDeletePreset={noopAsync} />)
    await user.click(screen.getByRole('button', { name: 'Modifica Babysitter' }))
    const nameInput = screen.getByRole('textbox', { name: 'Nome del lavoro' })
    await user.clear(nameInput)
    await user.type(nameInput, 'Baby Sitter')
    await user.click(screen.getByRole('button', { name: /Salva/ }))

    expect(onUpdateJob).toHaveBeenCalledWith('job-1', 'Baby Sitter', 'Martina', 15, false, 1.5, false)
  })

  it('adds a work entry with normalized time and break values', async () => {
    const user = userEvent.setup()
    const onAddEntry = vi.fn().mockResolvedValue(undefined)

    render(<RegisterView jobs={[job]} entries={[]} trashEntries={[]} onAddEntry={onAddEntry} onUpdateEntry={noopAsync} onDeleteEntry={noopAsync} onRestoreEntry={noopAsync} onPermanentlyDeleteEntry={noopAsync} onCreateJob={noopAsync} />)
    await user.clear(screen.getByRole('textbox', { name: 'Orario di inizio' }))
    await user.type(screen.getByRole('textbox', { name: 'Orario di inizio' }), '0900')
    await user.clear(screen.getByRole('textbox', { name: 'Orario di fine' }))
    await user.type(screen.getByRole('textbox', { name: 'Orario di fine' }), '1130')
    await user.clear(screen.getByRole('spinbutton', { name: /Pausa/ }))
    await user.type(screen.getByRole('spinbutton', { name: /Pausa/ }), '15')
    await user.click(screen.getByRole('button', { name: 'Registra ora' }))

    expect(onAddEntry).toHaveBeenCalledWith('job-1', entry.date, '09:00', '11:30', 15, 0)
  })

  it('opens an entry for editing and saves the updated times', async () => {
    const user = userEvent.setup()
    const onUpdateEntry = vi.fn().mockResolvedValue(undefined)

    render(<RegisterView jobs={[job]} entries={[entry]} trashEntries={[]} onAddEntry={noopAsync} onUpdateEntry={onUpdateEntry} onDeleteEntry={noopAsync} onRestoreEntry={noopAsync} onPermanentlyDeleteEntry={noopAsync} onCreateJob={noopAsync} />)
    await user.click(screen.getByRole('button', { name: 'Modifica entrata' }))
    const startInputs = screen.getAllByRole('textbox', { name: 'Orario di inizio' })
    await user.clear(startInputs[startInputs.length - 1])
    await user.type(startInputs[startInputs.length - 1], '1000')
    await user.click(screen.getByRole('button', { name: 'Salva modifiche' }))

    expect(onUpdateEntry).toHaveBeenCalledWith('entry-1', 'job-1', entry.date, '10:00', '18:00', 0, 0)
  })

  it('confirms a selected payment with optional details', async () => {
    const user = userEvent.setup()
    const onMarkEntriesPaid = vi.fn().mockResolvedValue(undefined)

    render(<PaymentsView jobs={[job]} entries={[entry]} onMarkEntriesPaid={onMarkEntriesPaid} onUpdatePayment={noopAsync} onCancelPayment={noopAsync} />)
    await user.click(screen.getByRole('checkbox', { name: 'Seleziona Babysitter' }))
    await user.click(screen.getByRole('button', { name: 'Aggiungi dettagli facoltativi' }))
    await user.click(screen.getByRole('button', { name: 'Conferma come pagato' }))

    expect(onMarkEntriesPaid).toHaveBeenCalledWith(['entry-1'], entry.date, null, null)
  })

  it('edits and can cancel an already received payment with explicit confirmation', async () => {
    const user = userEvent.setup()
    const paidEntry = { ...entry, paid: true, paidAt: `${entry.date}T12:00:00.000Z`, paymentMethod: 'contanti', paymentNote: 'Ricevuta' }
    const onUpdatePayment = vi.fn().mockResolvedValue(undefined)
    const onCancelPayment = vi.fn().mockResolvedValue(undefined)

    render(<PaymentsView jobs={[job]} entries={[paidEntry]} onMarkEntriesPaid={noopAsync} onUpdatePayment={onUpdatePayment} onCancelPayment={onCancelPayment} />)
    await user.click(screen.getByRole('button', { name: /Già pagati/ }))
    await user.click(screen.getByRole('button', { name: 'Modifica dettagli pagamento' }))
    await user.click(screen.getByRole('button', { name: /Salva/ }))
    expect(onUpdatePayment).toHaveBeenCalledWith('entry-1', entry.date, 'contanti', 'Ricevuta')

    await user.click(screen.getByRole('button', { name: 'Annulla pagamento' }))
    await user.type(screen.getByRole('textbox', { name: 'Conferma annullamento pagamento' }), 'Annulla')
    await user.click(screen.getByRole('button', { name: 'Conferma annullamento' }))
    expect(onCancelPayment).toHaveBeenCalledWith('entry-1')
  })
})
