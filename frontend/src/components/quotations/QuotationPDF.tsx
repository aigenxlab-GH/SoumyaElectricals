import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { QuotationDetail } from '@soumya/shared'
import logoUrl from '../../assets/logo.png'

export interface CompanyBranding {
  brand_name: string
  company_name: string
  company_address: string
  gstin_no: string
  company_email: string
  company_phone: string
  company_website: string
  authorized_signatory: string
}

// ── Hardcoded Terms & Conditions ───────────────────────────────────────────
const TERMS = [
  '1. All prices are inclusive of applicable taxes unless stated otherwise.',
  '2. Payment is due within 30 days of the invoice date.',
  '3. Goods once sold will not be taken back without prior approval.',
  '4. Delivery timelines are subject to material availability.',
  '5. Any disputes shall be subject to Bengaluru jurisdiction only.',
]

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1f2937',
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 35,
    position: 'relative',
  },
  // Watermark — centered logo image, low opacity, behind content
  watermarkWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  watermarkImg: {
    width: 380,
    height: 380,
    opacity: 0.07,
  },
  // Header
  header: {
    backgroundColor: '#1e3a5f',
    padding: 16,
    borderRadius: 6,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: { color: '#ffffff' },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 1 },
  companyTagline: { fontSize: 8, color: '#93c5fd', marginTop: 2 },
  companyContact: { fontSize: 7.5, color: '#d1d5db', marginTop: 1 },
  headerRight: { alignItems: 'flex-end' },
  quotationTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 0.5 },
  quotationCode: { fontSize: 10, color: '#93c5fd', marginTop: 3, fontFamily: 'Helvetica-Bold' },
  quotationDate: { fontSize: 8, color: '#d1d5db', marginTop: 2 },

  // Status badge
  statusRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, fontSize: 8, fontFamily: 'Helvetica-Bold' },

  // Sections
  sectionRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  sectionBox: { flex: 1, backgroundColor: '#f8fafc', border: '1pt solid #e2e8f0', borderRadius: 4, padding: 8 },
  sectionTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5, borderBottom: '0.5pt solid #e2e8f0', paddingBottom: 3 },
  fieldLabel: { fontSize: 7, color: '#9ca3af', marginTop: 3 },
  fieldValue: { fontSize: 8.5, color: '#111827', marginTop: 1 },

  // Table
  tableContainer: { marginBottom: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1e3a5f', padding: '6 8', borderRadius: '4 4 0 0' },
  tableHeaderCell: { color: '#ffffff', fontSize: 7.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: '5 8', borderBottom: '0.5pt solid #f1f5f9' },
  tableRowAlt: { flexDirection: 'row', padding: '5 8', borderBottom: '0.5pt solid #f1f5f9', backgroundColor: '#f8fafc' },
  tableCell: { fontSize: 8.5, color: '#374151' },

  // Column widths
  colNo: { width: '5%' },
  colCode: { width: '15%' },
  colName: { width: '40%' },
  colPrice: { width: '15%', textAlign: 'right' },
  colQty: { width: '10%', textAlign: 'center' },
  colTotal: { width: '15%', textAlign: 'right' },

  // Totals
  totalsContainer: { alignSelf: 'flex-end', width: 210, marginBottom: 10 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingHorizontal: 8 },
  totalsLabel: { fontSize: 8.5, color: '#6b7280' },
  totalsValue: { fontSize: 8.5, color: '#374151' },
  totalsFinalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#1e3a5f', borderRadius: 4, marginTop: 3 },
  totalsFinalLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  totalsFinalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#ffffff' },

  // Terms
  termsSection: { marginBottom: 12 },
  termsTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  termText: { fontSize: 7.5, color: '#6b7280', marginBottom: 2 },

  // Signatory
  signatoryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  signatoryBox: { alignItems: 'center', width: 130 },
  signatoryLine: { borderTop: '1pt solid #9ca3af', width: '100%', marginTop: 24, marginBottom: 4 },
  signatoryLabel: { fontSize: 8, color: '#6b7280', textAlign: 'center' },

  // Footer
  footer: { position: 'absolute', bottom: 20, left: 35, right: 35, borderTop: '0.5pt solid #e2e8f0', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#9ca3af' },
  gstin: { fontSize: 7, color: '#9ca3af' },
})

// ── Status badge colour ────────────────────────────────────────────────────
function statusStyle(status: string) {
  const map: Record<string, { bg: string; text: string }> = {
    draft:     { bg: '#f3f4f6', text: '#374151' },
    requested: { bg: '#fef9c3', text: '#854d0e' },
    approved:  { bg: '#dbeafe', text: '#1e40af' },
    rejected:  { bg: '#fee2e2', text: '#991b1b' },
    finalised: { bg: '#d1fae5', text: '#065f46' },
    cancelled: { bg: '#f1f5f9', text: '#475569' },
  }
  return map[status] ?? { bg: '#f3f4f6', text: '#374151' }
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const fmtMoney = (n: number) =>
  // Built-in PDF fonts (Helvetica) do not include the ₹ glyph — use Rs. instead
  'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Component ──────────────────────────────────────────────────────────────
interface Props {
  quotation: QuotationDetail
  company: CompanyBranding
}

export function QuotationPDF({ quotation, company }: Props) {
  const { bg, text: textColor } = statusStyle(quotation.status)
  const statusLabel = quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)

  const brandUpper = (company.brand_name || '').toUpperCase()

  // Compose a compact phone | email line, omitting empty fields cleanly
  const contactLine = [company.company_phone, company.company_email].filter(Boolean).join(' | ')

  return (
    <Document title={quotation.quotation_code} author={company.brand_name}>
      <Page size="A4" style={styles.page}>
        {/* Watermark — faint centered logo */}
        <View style={styles.watermarkWrap} fixed>
          <Image src={logoUrl} style={styles.watermarkImg} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{brandUpper}</Text>
            {company.company_address && company.company_address.split(',').map((part, i, arr) => {
              const trimmed = part.trim()
              if (!trimmed) return null
              return (
                <Text key={i} style={styles.companyContact}>
                  {trimmed}{i < arr.length - 1 ? ',' : ''}
                </Text>
              )
            })}
            {contactLine && <Text style={styles.companyContact}>{contactLine}</Text>}
            {company.company_website && <Text style={styles.companyContact}>{company.company_website}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.quotationTitle}>QUOTATION</Text>
            <Text style={styles.quotationCode}>{quotation.quotation_code}</Text>
            <Text style={styles.quotationDate}>Date: {fmt(quotation.quotation_date)}</Text>
            <Text style={styles.quotationDate}>Delivery: {fmt(quotation.delivery_date)}</Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={styles.statusRow}>
          <Text style={[styles.statusBadge, { backgroundColor: bg, color: textColor }]}>
            {statusLabel}
          </Text>
        </View>

        {/* Bill To / Ship To / Prepared By */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.fieldValue}>{quotation.client_name}</Text>
            <Text style={styles.fieldLabel}>Phone</Text>
            <Text style={styles.fieldValue}>{quotation.client_phone}</Text>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>{quotation.client_email}</Text>
            <Text style={styles.fieldLabel}>Address</Text>
            <Text style={styles.fieldValue}>{quotation.address}</Text>
          </View>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Ship To</Text>
            <Text style={styles.fieldValue}>{quotation.client_name}</Text>
            <Text style={styles.fieldLabel}>Delivery Address</Text>
            <Text style={styles.fieldValue}>{quotation.delivery_address}</Text>
          </View>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Prepared By</Text>
            <Text style={styles.fieldValue}>{quotation.creator_name_snapshot}</Text>
            <Text style={styles.fieldLabel}>Employee ID</Text>
            <Text style={styles.fieldValue}>{quotation.creator_employee_id_snapshot}</Text>
            {quotation.creator_mobile_snapshot && (
              <>
                <Text style={styles.fieldLabel}>Mobile</Text>
                <Text style={styles.fieldValue}>{quotation.creator_mobile_snapshot}</Text>
              </>
            )}
            {quotation.approved_at && (
              <>
                <Text style={styles.fieldLabel}>Approved On</Text>
                <Text style={styles.fieldValue}>{fmt(quotation.approved_at)}</Text>
              </>
            )}
          </View>
        </View>

        {/* Product Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colNo]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.colCode]}>Code</Text>
            <Text style={[styles.tableHeaderCell, styles.colName]}>Product Name</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
          </View>
          {quotation.items.map((item, idx) => (
            <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, styles.colNo]}>{idx + 1}</Text>
              <Text style={[styles.tableCell, styles.colCode]}>{item.product_code ?? '—'}</Text>
              <Text style={[styles.tableCell, styles.colName]}>{item.product_name_snapshot}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{fmtMoney(item.selling_price_snapshot)}</Text>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colTotal]}>{fmtMoney(item.total_price)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{fmtMoney(quotation.subtotal)}</Text>
          </View>
          {quotation.discount_pct > 0 && (
            <>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount ({quotation.discount_pct}%)</Text>
                <Text style={styles.totalsValue}>− {fmtMoney(quotation.discount_amount)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>After Discount</Text>
                <Text style={styles.totalsValue}>{fmtMoney(quotation.amount_after_discount)}</Text>
              </View>
            </>
          )}
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>GST ({quotation.gst_pct}%)</Text>
            <Text style={styles.totalsValue}>+ {fmtMoney(quotation.gst_amount)}</Text>
          </View>
          <View style={styles.totalsFinalRow}>
            <Text style={styles.totalsFinalLabel}>FINAL AMOUNT</Text>
            <Text style={styles.totalsFinalValue}>{fmtMoney(quotation.final_amount)}</Text>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          {TERMS.map((t, i) => (
            <Text key={i} style={styles.termText}>{t}</Text>
          ))}
        </View>

        {/* GSTIN */}
        {company.gstin_no && (
          <Text style={{ fontSize: 8, color: '#6b7280', marginBottom: 8 }}>
            GSTIN: {company.gstin_no}
          </Text>
        )}

        {/* Signatory */}
        <View style={styles.signatoryRow}>
          <View style={styles.signatoryBox}>
            <View style={styles.signatoryLine} />
            <Text style={styles.signatoryLabel}>Prepared By</Text>
            <Text style={[styles.signatoryLabel, { fontFamily: 'Helvetica-Bold', fontSize: 8 }]}>
              {quotation.creator_name_snapshot}
            </Text>
          </View>
          <View style={styles.signatoryBox}>
            <View style={styles.signatoryLine} />
            <Text style={styles.signatoryLabel}>Authorised Signatory</Text>
            <Text style={[styles.signatoryLabel, { fontFamily: 'Helvetica-Bold', fontSize: 8 }]}>
              {company.authorized_signatory || company.brand_name}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{[company.company_name || company.brand_name, company.company_website].filter(Boolean).join(' | ')}</Text>
          {company.gstin_no && <Text style={styles.gstin}>GSTIN: {company.gstin_no}</Text>}
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
