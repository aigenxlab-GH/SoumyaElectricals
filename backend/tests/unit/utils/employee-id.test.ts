import { formatEmployeeId, employeeIdToEmail } from '../../../src/utils/employee-id'

describe('formatEmployeeId', () => {
  it('formats sequence 0 as SE_5000 (owner)', () => {
    expect(formatEmployeeId(0)).toBe('SE_5000')
  })

  it('formats sequence 1 as SE_5001', () => {
    expect(formatEmployeeId(1)).toBe('SE_5001')
  })

  it('formats sequence 100 as SE_5100', () => {
    expect(formatEmployeeId(100)).toBe('SE_5100')
  })

  it('formats sequence 999 as SE_5999', () => {
    expect(formatEmployeeId(999)).toBe('SE_5999')
  })
})

describe('employeeIdToEmail', () => {
  it('maps employee ID to synthetic email', () => {
    expect(employeeIdToEmail('SE_5001')).toBe('SE_5001@soumyaelectricals.internal')
  })

  it('maps owner ID SE_5000 to email', () => {
    expect(employeeIdToEmail('SE_5000')).toBe('SE_5000@soumyaelectricals.internal')
  })
})
