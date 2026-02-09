import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface AuditEntry {
  id: string
  changeType: string
  fieldName?: string
  previousValue?: string
  newValue?: string
  timestamp: string
  user?: {
    name: string
    email: string
  }
}

interface AuditPDFOptions {
  requisitionId: string
  requisitionTitle: string
  auditTrail: AuditEntry[]
  companyName?: string
  companyLogo?: string
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  CREATED: 'Created',
  FIELD_UPDATED: 'Field Updated',
  STATUS_CHANGED: 'Status Changed',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PAYMENT_RECORDED: 'Payment Recorded',
  ATTACHMENT_UPLOADED: 'Attachment Uploaded',
  ATTACHMENT_DOWNLOADED: 'Attachment Downloaded',
  NOTIFICATION_SENT: 'Notification Sent',
}

export async function generateAuditTrailPDF(options: AuditPDFOptions): Promise<void> {
  const {
    requisitionId,
    requisitionTitle,
    auditTrail,
    companyName = 'IRMS',
    companyLogo,
  } = options

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPosition = 20

  // Header with company logo and details
  if (companyLogo) {
    try {
      doc.addImage(companyLogo, 'PNG', 15, yPosition, 30, 30)
    } catch (e) {
      console.warn('Failed to add company logo to PDF')
    }
  }

  // Company name and title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName, companyLogo ? 50 : 15, yPosition + 10)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Audit Trail Report', companyLogo ? 50 : 15, yPosition + 18)

  // Report metadata
  yPosition += 40
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Report Details:', 15, yPosition)

  yPosition += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Requisition ID: ${requisitionId}`, 15, yPosition)
  yPosition += 5
  doc.text(`Requisition Title: ${requisitionTitle}`, 15, yPosition)
  yPosition += 5
  doc.text(`Generated: ${new Date().toLocaleString()}`, 15, yPosition)
  yPosition += 5
  doc.text(`Total Entries: ${auditTrail.length}`, 15, yPosition)

  // Audit trail table
  yPosition += 10

  const tableData = auditTrail.map((entry) => [
    formatDate(entry.timestamp),
    CHANGE_TYPE_LABELS[entry.changeType] || entry.changeType,
    entry.fieldName || '-',
    entry.user?.name || 'System',
    entry.user?.email || '-',
  ])

  const jsPDFWithPlugin = doc as any
  jsPDFWithPlugin.autoTable({
    head: [['Timestamp', 'Change Type', 'Field', 'User', 'Email']],
    body: tableData,
    startY: yPosition,
    margin: { top: 10, right: 15, bottom: 15, left: 15 },
    headStyles: {
      fillColor: [188, 0, 4], // Brand red color
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 51, 51],
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 30 },
      4: { cellWidth: 40 },
    },
    didDrawPage: (data: any) => {
      // Footer
      const pageCount = jsPDFWithPlugin.internal.getNumberOfPages()
      const pageSize = doc.internal.pageSize
      const pageHeight = pageSize.getHeight()
      const pageWidth = pageSize.getWidth()

      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )

      // Company footer
      doc.setFontSize(7)
      doc.text(
        'This is an official audit trail report. All entries are immutable and cannot be modified.',
        15,
        pageHeight - 5
      )
    },
  })

  // Detailed entries section (if there are entries with values)
  const entriesWithValues = auditTrail.filter(
    (e) => e.previousValue || e.newValue
  )

  if (entriesWithValues.length > 0) {
    doc.addPage()
    yPosition = 20

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Detailed Changes', 15, yPosition)

    yPosition += 10

    entriesWithValues.forEach((entry, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        doc.addPage()
        yPosition = 20
      }

      // Entry header
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(188, 0, 4)
      doc.text(
        `${index + 1}. ${CHANGE_TYPE_LABELS[entry.changeType] || entry.changeType}`,
        15,
        yPosition
      )

      yPosition += 6

      // Entry details
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 51, 51)
      doc.setFontSize(8)

      doc.text(`Timestamp: ${formatDate(entry.timestamp)}`, 20, yPosition)
      yPosition += 4

      if (entry.user) {
        doc.text(`User: ${entry.user.name} (${entry.user.email})`, 20, yPosition)
        yPosition += 4
      }

      if (entry.fieldName) {
        doc.text(`Field: ${entry.fieldName}`, 20, yPosition)
        yPosition += 4
      }

      if (entry.previousValue) {
        doc.text('Previous Value:', 20, yPosition)
        yPosition += 3
        const prevValueLines = doc.splitTextToSize(
          formatValue(entry.previousValue),
          pageWidth - 40
        )
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        prevValueLines.forEach((line: string) => {
          doc.text(line, 25, yPosition)
          yPosition += 3
        })
        yPosition += 2
      }

      if (entry.newValue) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.text('New Value:', 20, yPosition)
        yPosition += 3
        const newValueLines = doc.splitTextToSize(
          formatValue(entry.newValue),
          pageWidth - 40
        )
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        newValueLines.forEach((line: string) => {
          doc.text(line, 25, yPosition)
          yPosition += 3
        })
        yPosition += 4
      }

      // Separator
      doc.setDrawColor(200, 200, 200)
      doc.line(15, yPosition, pageWidth - 15, yPosition)
      yPosition += 6
    })
  }

  // Save the PDF
  const fileName = `audit-trail-${requisitionId}-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatValue(value: string | undefined): string {
  if (!value) return 'N/A'
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'object') {
      return JSON.stringify(parsed, null, 2)
    }
    return String(parsed)
  } catch {
    return value
  }
}
