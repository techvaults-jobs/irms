import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailNotificationPayload {
  to: string
  subject: string
  type: 'requisition_created' | 'requisition_approved' | 'requisition_rejected' | 'approval_pending' | 'payment_recorded'
  data: Record<string, any>
}

const emailTemplates = {
  requisition_created: (data: any) => ({
    subject: `New Requisition Created: ${data.requisitionId}`,
    html: `
      <h2>New Requisition Created</h2>
      <p>A new requisition has been created:</p>
      <ul>
        <li><strong>Requisition ID:</strong> ${data.requisitionId}</li>
        <li><strong>Amount:</strong> ₦${data.amount?.toLocaleString()}</li>
        <li><strong>Description:</strong> ${data.description}</li>
        <li><strong>Department:</strong> ${data.department}</li>
        <li><strong>Created By:</strong> ${data.createdBy}</li>
      </ul>
      <p><a href="${data.dashboardUrl}/requisitions/${data.requisitionId}">View Requisition</a></p>
    `,
  }),
  requisition_approved: (data: any) => ({
    subject: `Requisition Approved: ${data.requisitionId}`,
    html: `
      <h2>Requisition Approved</h2>
      <p>Your requisition has been approved:</p>
      <ul>
        <li><strong>Requisition ID:</strong> ${data.requisitionId}</li>
        <li><strong>Amount:</strong> ₦${data.amount?.toLocaleString()}</li>
        <li><strong>Approved By:</strong> ${data.approvedBy}</li>
        <li><strong>Approval Date:</strong> ${data.approvalDate}</li>
      </ul>
      <p><a href="${data.dashboardUrl}/requisitions/${data.requisitionId}">View Details</a></p>
    `,
  }),
  requisition_rejected: (data: any) => ({
    subject: `Requisition Rejected: ${data.requisitionId}`,
    html: `
      <h2>Requisition Rejected</h2>
      <p>Your requisition has been rejected:</p>
      <ul>
        <li><strong>Requisition ID:</strong> ${data.requisitionId}</li>
        <li><strong>Amount:</strong> ₦${data.amount?.toLocaleString()}</li>
        <li><strong>Rejected By:</strong> ${data.rejectedBy}</li>
        <li><strong>Reason:</strong> ${data.reason}</li>
      </ul>
      <p><a href="${data.dashboardUrl}/requisitions/${data.requisitionId}">View Details</a></p>
    `,
  }),
  approval_pending: (data: any) => ({
    subject: `Pending Approval Required: ${data.requisitionId}`,
    html: `
      <h2>Approval Required</h2>
      <p>A requisition is awaiting your approval:</p>
      <ul>
        <li><strong>Requisition ID:</strong> ${data.requisitionId}</li>
        <li><strong>Amount:</strong> ₦${data.amount?.toLocaleString()}</li>
        <li><strong>Submitted By:</strong> ${data.submittedBy}</li>
        <li><strong>Description:</strong> ${data.description}</li>
      </ul>
      <p><a href="${data.dashboardUrl}/approvals">Review Approvals</a></p>
    `,
  }),
  payment_recorded: (data: any) => ({
    subject: `Payment Recorded: ${data.requisitionId}`,
    html: `
      <h2>Payment Recorded</h2>
      <p>A payment has been recorded for your requisition:</p>
      <ul>
        <li><strong>Requisition ID:</strong> ${data.requisitionId}</li>
        <li><strong>Amount Paid:</strong> ₦${data.amountPaid?.toLocaleString()}</li>
        <li><strong>Payment Date:</strong> ${data.paymentDate}</li>
        <li><strong>Recorded By:</strong> ${data.recordedBy}</li>
      </ul>
      <p><a href="${data.dashboardUrl}/requisitions/${data.requisitionId}">View Details</a></p>
    `,
  }),
}

export async function sendEmailNotification(payload: EmailNotificationPayload) {
  try {
    const template = emailTemplates[payload.type]
    if (!template) {
      throw new Error(`Unknown email template: ${payload.type}`)
    }

    const emailContent = template(payload.data)

    const response = await resend.emails.send({
      from: 'IRMS <noreply@irms.techvaults.com>',
      to: payload.to,
      subject: emailContent.subject,
      html: emailContent.html,
    })

    if (response.error) {
      console.error('Email send error:', response.error)
      throw new Error(`Failed to send email: ${response.error.message}`)
    }

    console.log(`Email sent successfully to ${payload.to}:`, response.data?.id)
    return response.data
  } catch (error) {
    console.error('Error sending email notification:', error)
    throw error
  }
}

export async function sendBulkEmailNotifications(payloads: EmailNotificationPayload[]) {
  const results = await Promise.allSettled(
    payloads.map(payload => sendEmailNotification(payload))
  )

  const successful = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  console.log(`Bulk email send: ${successful} successful, ${failed} failed`)
  return { successful, failed, results }
}
