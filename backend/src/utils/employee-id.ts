const EMPLOYEE_ID_BASE = 5000

export function formatEmployeeId(seq: number): string {
  return `SE_${EMPLOYEE_ID_BASE + seq}`
}

export function employeeIdToEmail(employeeId: string): string {
  return `${employeeId}@soumyaelectricals.internal`
}
