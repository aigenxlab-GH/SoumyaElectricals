import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'
import { AppError } from '../types'
import { fail } from '../utils/response'

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json(fail('UNAUTHORIZED', 'Missing or invalid Authorization header'))
  }

  const token = authHeader.slice(7)

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return res.status(401).json(fail('UNAUTHORIZED', 'Invalid or expired token'))
  }

  const { data: userRow, error: dbError } = await supabase
    .from('users')
    .select('id, employee_id, role, is_default_password, manager_id')
    .eq('id', data.user.id)
    .single()

  if (dbError || !userRow) {
    return res.status(401).json(fail('UNAUTHORIZED', 'User record not found'))
  }

  req.user = userRow
  next()
}
