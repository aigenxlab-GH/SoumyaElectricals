import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LeaveBalanceWidget } from '../../src/components/leaves/LeaveBalanceWidget'

const baseBalance = {
  id: 'test-id',
  user_id: 'user-1',
  total_credited: 21,
  used: 7,
  remaining: 14,
  updated_at: '2024-01-01T00:00:00Z',
}

describe('LeaveBalanceWidget', () => {
  it('renders total credited, used, and remaining values', () => {
    render(<LeaveBalanceWidget balance={baseBalance} />)
    expect(screen.getByText('21')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
  })

  it('displays the correct usage percentage', () => {
    render(<LeaveBalanceWidget balance={baseBalance} />)
    // 7/21 = 33%
    expect(screen.getByText('33% used')).toBeInTheDocument()
  })

  it('shows 0% used when no leaves have been taken', () => {
    render(<LeaveBalanceWidget balance={{ ...baseBalance, used: 0, remaining: 21 }} />)
    expect(screen.getByText('0% used')).toBeInTheDocument()
  })

  it('shows 100% used when all leaves are consumed', () => {
    render(<LeaveBalanceWidget balance={{ ...baseBalance, used: 21, remaining: 0 }} />)
    expect(screen.getByText('100% used')).toBeInTheDocument()
  })

  it('shows 0% when total_credited is zero (avoids division by zero)', () => {
    render(<LeaveBalanceWidget balance={{ ...baseBalance, total_credited: 0, used: 0, remaining: 0 }} />)
    expect(screen.getByText('0% used')).toBeInTheDocument()
  })
})
