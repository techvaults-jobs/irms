import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedTestReports() {
  try {
    console.log('🌱 Seeding test data for reports...')

    // Get or create a department first
    let department = await prisma.department.findFirst({
      where: { id: 'dept-1' },
    })

    if (!department) {
      department = await prisma.department.create({
        data: {
          id: 'dept-1',
          name: 'Operations',
        },
      })
      console.log('✅ Created test department:', department.name)
    }

    // Get or create a test user
    let user = await prisma.user.findFirst({
      where: { email: 'manager@test.com' },
    })

    if (!user) {
      const hashedPassword = await bcrypt.hash('password123', 10)
      user = await prisma.user.create({
        data: {
          email: 'manager@test.com',
          name: 'Test Manager',
          password: hashedPassword,
          role: 'MANAGER',
          departmentId: 'dept-1',
        },
      })
      console.log('✅ Created test user:', user.email)
    }

    // Create test requisitions for different months
    const testData = [
      // January 2026
      {
        title: 'Office Supplies - January',
        category: 'Office Supplies',
        estimatedCost: new Decimal(50000),
        approvedCost: new Decimal(45000),
        actualCostPaid: new Decimal(45000),
        status: 'PAID',
        createdAt: new Date(2026, 0, 5),
      },
      {
        title: 'Equipment - January',
        category: 'Equipment',
        estimatedCost: new Decimal(150000),
        approvedCost: new Decimal(140000),
        actualCostPaid: new Decimal(140000),
        status: 'PAID',
        createdAt: new Date(2026, 0, 10),
      },
      {
        title: 'Software License - January',
        category: 'Software',
        estimatedCost: new Decimal(75000),
        approvedCost: null,
        actualCostPaid: null,
        status: 'SUBMITTED',
        createdAt: new Date(2026, 0, 15),
      },
      // February 2026
      {
        title: 'Office Supplies - February',
        category: 'Office Supplies',
        estimatedCost: new Decimal(60000),
        approvedCost: new Decimal(55000),
        actualCostPaid: new Decimal(55000),
        status: 'PAID',
        createdAt: new Date(2026, 1, 3),
      },
      {
        title: 'Maintenance - February',
        category: 'Maintenance',
        estimatedCost: new Decimal(120000),
        approvedCost: new Decimal(120000),
        actualCostPaid: null,
        status: 'APPROVED',
        createdAt: new Date(2026, 1, 8),
      },
      {
        title: 'Training - February',
        category: 'Training',
        estimatedCost: new Decimal(200000),
        approvedCost: new Decimal(180000),
        actualCostPaid: new Decimal(180000),
        status: 'PAID',
        createdAt: new Date(2026, 1, 12),
      },
      {
        title: 'Consulting - February',
        category: 'Consulting',
        estimatedCost: new Decimal(300000),
        approvedCost: null,
        actualCostPaid: null,
        status: 'UNDER_REVIEW',
        createdAt: new Date(2026, 1, 20),
      },
      // December 2025 (for yearly summary)
      {
        title: 'Year-end Supplies',
        category: 'Office Supplies',
        estimatedCost: new Decimal(80000),
        approvedCost: new Decimal(75000),
        actualCostPaid: new Decimal(75000),
        status: 'PAID',
        createdAt: new Date(2025, 11, 28),
      },
    ]

    let createdCount = 0
    for (const data of testData) {
      const existing = await prisma.requisition.findFirst({
        where: { title: data.title },
      })

      if (!existing) {
        await prisma.requisition.create({
          data: {
            title: data.title,
            category: data.category,
            description: `Test requisition for ${data.category}`,
            estimatedCost: data.estimatedCost,
            approvedCost: data.approvedCost,
            actualCostPaid: data.actualCostPaid,
            currency: 'NGN',
            urgencyLevel: 'MEDIUM',
            businessJustification: 'Test data for reports',
            status: data.status,
            submitterId: user.id,
            departmentId: department.id,
            createdAt: data.createdAt,
            updatedAt: data.createdAt,
          },
        })
        createdCount++
        console.log(`✅ Created: ${data.title}`)
      }
    }

    console.log(`\n✨ Seeding complete! Created ${createdCount} test requisitions`)

    // Create approval steps for UNDER_REVIEW requisitions
    console.log('\n📋 Creating approval steps...')
    const underReviewReqs = await prisma.requisition.findMany({
      where: { status: 'UNDER_REVIEW' },
    })

    for (const req of underReviewReqs) {
      const existingSteps = await prisma.approvalStep.count({
        where: { requisitionId: req.id },
      })

      if (existingSteps === 0) {
        // Create a MANAGER approval step
        await prisma.approvalStep.create({
          data: {
            requisitionId: req.id,
            stepNumber: 1,
            requiredRole: 'MANAGER',
            assignedUserId: user.id,
            status: 'PENDING',
          },
        })
        console.log(`✅ Created approval step for: ${req.title}`)
      }
    }

    console.log(`\n✨ Approval steps created!`)

    // Display summary
    const totalRequisitions = await prisma.requisition.count()
    const statusCounts = await prisma.requisition.groupBy({
      by: ['status'],
      _count: true,
    })

    console.log(`\n📊 Database Summary:`)
    console.log(`Total Requisitions: ${totalRequisitions}`)
    console.log(`Status Breakdown:`)
    statusCounts.forEach(({ status, _count }) => {
      console.log(`  - ${status}: ${_count}`)
    })

    // Show date range
    const minDate = await prisma.requisition.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    })
    const maxDate = await prisma.requisition.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })

    if (minDate && maxDate) {
      console.log(`\n📅 Date Range: ${minDate.createdAt.toLocaleDateString()} to ${maxDate.createdAt.toLocaleDateString()}`)
    }
  } catch (error) {
    console.error('❌ Error seeding data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedTestReports()
