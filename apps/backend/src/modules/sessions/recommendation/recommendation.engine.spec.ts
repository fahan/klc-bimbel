import { buildCandidateSlots } from './recommendation.engine'

describe('buildCandidateSlots', () => {
  it('builds 30-minute grid slots that fit before window end', () => {
    const slots = buildCandidateSlots({
      activeDays: ['SENIN'],
      timeWindow: { start: '14:00', end: '16:00' },
      durationMinutes: 60,
    })
    expect(slots.map((s) => s.startMinutes)).toEqual([840, 870, 900])
    expect(slots.every((s) => s.dayOfWeek === 'SENIN')).toBe(true)
  })

  it('expands across multiple active days', () => {
    const slots = buildCandidateSlots({
      activeDays: ['SENIN', 'SELASA'],
      timeWindow: { start: '14:00', end: '15:00' },
      durationMinutes: 60,
    })
    expect(slots).toEqual([
      { dayOfWeek: 'SENIN', startMinutes: 840 },
      { dayOfWeek: 'SELASA', startMinutes: 840 },
    ])
  })

  it('excludes slots that collide with the break window', () => {
    const slots = buildCandidateSlots({
      activeDays: ['SENIN'],
      timeWindow: { start: '14:00', end: '19:00' },
      breakWindow: { start: '17:00', end: '18:00' },
      durationMinutes: 60,
    })
    const starts = slots.map((s) => s.startMinutes)
    expect(starts).toContain(960) // 16:00
    expect(starts).not.toContain(990) // 16:30
    expect(starts).not.toContain(1020) // 17:00
    expect(starts).toContain(1080) // 18:00
  })
})
