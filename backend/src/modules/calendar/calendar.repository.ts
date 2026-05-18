import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'

export const calendarRepository = {
  async getMonthData(userId: string, year: number, month: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`

    const [timecards, leaves, holidays] = await Promise.all([
      supabase
        .from('timecards')
        .select('date, status')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('leaves')
        .select('date, status')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('holidays')
        .select('date, name')
        .gte('date', startDate)
        .lte('date', endDate),
    ])

    if (timecards.error) throw new AppError('DB_ERROR', timecards.error.message, 500)
    if (leaves.error) throw new AppError('DB_ERROR', leaves.error.message, 500)
    if (holidays.error) throw new AppError('DB_ERROR', holidays.error.message, 500)

    return {
      timecards: timecards.data ?? [],
      leaves: leaves.data ?? [],
      holidays: holidays.data ?? [],
    }
  },
}
