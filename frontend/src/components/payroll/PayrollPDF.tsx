import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { Payroll } from '@soumya/shared'
import type { CompanyBranding } from '../quotations/QuotationPDF'
import logoUrl from '../../assets/logo.png'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1f2937', paddingTop: 30, paddingBottom: 50, paddingHorizontal: 35, position: 'relative' },

  watermarkWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: -1 },
  watermarkImg:  { width: 380, height: 380, opacity: 0.07 },

  header: { backgroundColor: '#1e3a5f', padding: 16, borderRadius: 6, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { color: '#ffffff' },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 1 },
  companyContact: { fontSize: 7.5, color: '#d1d5db', marginTop: 1 },
  headerRight: { alignItems: 'flex-end' },
  title:    { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 0.5 },
  subtitle: { fontSize: 10, color: '#93c5fd', marginTop: 3, fontFamily: 'Helvetica-Bold' },
  smallMeta:{ fontSize: 8, color: '#d1d5db', marginTop: 2 },

  // Status pill
  statusRow:   { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, fontSize: 8, fontFamily: 'Helvetica-Bold' },

  // Section boxes
  sectionRow:   { flexDirection: 'row', gap: 10, marginBottom: 10 },
  sectionBox:   { flex: 1, backgroundColor: '#f8fafc', border: '1pt solid #e2e8f0', borderRadius: 4, padding: 8 },
  sectionTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5, borderBottom: '0.5pt solid #e2e8f0', paddingBottom: 3 },
  fieldLabel:   { fontSize: 7, color: '#9ca3af', marginTop: 3 },
  fieldValue:   { fontSize: 8.5, color: '#111827', marginTop: 1 },

  // Earnings/Deductions block
  twoCol: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  block:  { flex: 1, border: '1pt solid #e2e8f0', borderRadius: 4 },
  blockTitle:    { backgroundColor: '#1e3a5f', color: '#ffffff', fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '5 8', textTransform: 'uppercase', letterSpacing: 0.5, borderRadius: '4 4 0 0' },
  blockRow:      { flexDirection: 'row', justifyContent: 'space-between', padding: '5 8', borderBottom: '0.5pt solid #f1f5f9' },
  blockRowAlt:   { flexDirection: 'row', justifyContent: 'space-between', padding: '5 8', borderBottom: '0.5pt solid #f1f5f9', backgroundColor: '#f8fafc' },
  blockLabel:    { fontSize: 8.5, color: '#374151' },
  blockValue:    { fontSize: 8.5, color: '#374151' },
  blockTotalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '6 8', backgroundColor: '#eff6ff', borderTop: '1pt solid #1e3a5f', borderRadius: '0 0 4 4' },
  blockTotalLbl: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e3a5f' },
  blockTotalVal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e3a5f' },

  // Net pay
  netPayBox:  { marginTop: 6, padding: 10, backgroundColor: '#1e3a5f', borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netPayLbl:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 0.5 },
  netPayVal:  { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#ffffff' },

  // Attendance
  attTable:   { flexDirection: 'row', marginTop: 10, marginBottom: 4 },
  attCell:    { flex: 1, backgroundColor: '#f8fafc', border: '1pt solid #e2e8f0', borderRadius: 4, padding: 6, marginRight: 4, alignItems: 'center' },
  attCellLast:{ flex: 1, backgroundColor: '#f8fafc', border: '1pt solid #e2e8f0', borderRadius: 4, padding: 6, alignItems: 'center' },
  attLabel:   { fontSize: 7, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  attValue:   { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1f2937', marginTop: 2 },

  // Signatory
  signRow:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  signBox:    { alignItems: 'center', width: 130 },
  signLine:   { borderTop: '1pt solid #9ca3af', width: '100%', marginTop: 24, marginBottom: 4 },
  signLabel:  { fontSize: 8, color: '#6b7280', textAlign: 'center' },

  footer:     { position: 'absolute', bottom: 20, left: 35, right: 35, borderTop: '0.5pt solid #e2e8f0', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#9ca3af' },
})

function statusStyle(status: string) {
  const map: Record<string, { bg: string; text: string }> = {
    draft:     { bg: '#f3f4f6', text: '#374151' },
    finalised: { bg: '#dbeafe', text: '#1e40af' },
    paid:      { bg: '#d1fae5', text: '#065f46' },
  }
  return map[status] ?? { bg: '#f3f4f6', text: '#374151' }
}

const fmtMoney = (n: number) =>
  'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface Props { payroll: Payroll; company: CompanyBranding }

export function PayrollPDF({ payroll, company }: Props) {
  const { bg, text: textColor } = statusStyle(payroll.status)
  const statusLabel = payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)
  const brandUpper = (company.brand_name || '').toUpperCase()
  const contactLine = [company.company_phone, company.company_email].filter(Boolean).join(' | ')

  return (
    <Document title={`Payslip-${payroll.employee_id_snapshot}-${payroll.period_year}-${payroll.period_month}`} author={company.brand_name}>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <View style={styles.watermarkWrap} fixed>
          <Image src={logoUrl} style={styles.watermarkImg} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{brandUpper}</Text>
            {company.company_address && company.company_address.split(',').map((part, i, arr) => {
              const t = part.trim()
              if (!t) return null
              return <Text key={i} style={styles.companyContact}>{t}{i < arr.length - 1 ? ',' : ''}</Text>
            })}
            {contactLine && <Text style={styles.companyContact}>{contactLine}</Text>}
            {company.gstin_no && <Text style={styles.companyContact}>GSTIN: {company.gstin_no}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>PAYSLIP</Text>
            <Text style={styles.subtitle}>{MONTHS[payroll.period_month - 1]} {payroll.period_year}</Text>
            <Text style={styles.smallMeta}>{fmt(payroll.period_start)} – {fmt(payroll.period_end)}</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusBadge, { backgroundColor: bg, color: textColor }]}>{statusLabel}</Text>
        </View>

        {/* Employee block */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Employee</Text>
            <Text style={styles.fieldValue}>{payroll.employee_name_snapshot}</Text>
            <Text style={styles.fieldLabel}>Employee ID</Text>
            <Text style={styles.fieldValue}>{payroll.employee_id_snapshot}</Text>
            <Text style={styles.fieldLabel}>Role</Text>
            <Text style={[styles.fieldValue, { textTransform: 'capitalize' }]}>{payroll.employee_role_snapshot}</Text>
            <Text style={styles.fieldLabel}>Date of Joining</Text>
            <Text style={styles.fieldValue}>{fmt(payroll.employee_join_date_snapshot)}</Text>
          </View>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Pay Summary</Text>
            <Text style={styles.fieldLabel}>Monthly Salary (CTC base)</Text>
            <Text style={styles.fieldValue}>{fmtMoney(payroll.monthly_salary)}</Text>
            <Text style={styles.fieldLabel}>Per-Day Rate</Text>
            <Text style={styles.fieldValue}>{fmtMoney(payroll.per_day_rate)}</Text>
            <Text style={styles.fieldLabel}>Working Days (Period)</Text>
            <Text style={styles.fieldValue}>{payroll.effective_working_days} of {payroll.full_period_working_days}</Text>
          </View>
        </View>

        {/* Attendance cells */}
        <View style={styles.attTable}>
          <View style={styles.attCell}><Text style={styles.attLabel}>Present</Text><Text style={styles.attValue}>{payroll.present_days}</Text></View>
          <View style={styles.attCell}><Text style={styles.attLabel}>Paid Leave</Text><Text style={styles.attValue}>{payroll.paid_leave_days}</Text></View>
          <View style={styles.attCell}><Text style={styles.attLabel}>Absent</Text><Text style={styles.attValue}>{payroll.unpaid_absent_days}</Text></View>
          <View style={styles.attCell}><Text style={styles.attLabel}>LOP (Leave)</Text><Text style={styles.attValue}>{payroll.lop_from_writeoff_days}</Text></View>
          <View style={styles.attCellLast}><Text style={styles.attLabel}>OT (hrs)</Text><Text style={styles.attValue}>{Number(payroll.overtime_hours).toFixed(1)}</Text></View>
        </View>

        {/* Earnings + Deductions */}
        <View style={styles.twoCol}>
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Earnings</Text>
            <View style={styles.blockRow}>
              <Text style={styles.blockLabel}>Earned Salary ({payroll.present_days + payroll.paid_leave_days} days × {fmtMoney(payroll.per_day_rate)})</Text>
              <Text style={styles.blockValue}>{fmtMoney(payroll.earned_salary)}</Text>
            </View>
            <View style={styles.blockRowAlt}>
              <Text style={styles.blockLabel}>Overtime ({Number(payroll.overtime_hours).toFixed(1)} hrs)</Text>
              <Text style={styles.blockValue}>{fmtMoney(payroll.overtime_pay)}</Text>
            </View>
            <View style={styles.blockTotalRow}>
              <Text style={styles.blockTotalLbl}>Gross Pay</Text>
              <Text style={styles.blockTotalVal}>{fmtMoney(payroll.gross_pay)}</Text>
            </View>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Deductions</Text>
            <View style={styles.blockRow}>
              <Text style={styles.blockLabel}>Loss of Pay ({payroll.total_lop_days} days × {fmtMoney(payroll.per_day_rate)})</Text>
              <Text style={styles.blockValue}>{fmtMoney(payroll.lop_deduction)}</Text>
            </View>
            <View style={styles.blockTotalRow}>
              <Text style={styles.blockTotalLbl}>Total Deductions</Text>
              <Text style={styles.blockTotalVal}>{fmtMoney(payroll.lop_deduction)}</Text>
            </View>
          </View>
        </View>

        {/* Net pay banner */}
        <View style={styles.netPayBox}>
          <Text style={styles.netPayLbl}>NET PAY</Text>
          <Text style={styles.netPayVal}>{fmtMoney(payroll.net_pay)}</Text>
        </View>

        {/* Signatory */}
        <View style={styles.signRow}>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Employee Signature</Text>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Authorised Signatory</Text>
            <Text style={[styles.signLabel, { fontFamily: 'Helvetica-Bold', fontSize: 8 }]}>
              {company.authorized_signatory || company.brand_name}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{[company.company_name || company.brand_name, company.company_website].filter(Boolean).join(' | ')}</Text>
          <Text style={styles.footerText}>System-generated. No signature required if delivered electronically.</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
