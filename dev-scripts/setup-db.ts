/**
 * Database Setup Script
 * Initializes the database and seeds test data with hashed passwords
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Helper function to hash passwords
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

async function main() {
  console.log('🔧 Starting database setup...')

  try {
    // Clean up existing data using raw SQL to bypass immutability constraints
    console.log('🧹 Cleaning up existing data...')
    
    // Try to disable triggers if they exist (for existing databases)
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "AuditTrail" DISABLE TRIGGER IF EXISTS audit_trail_prevent_update;`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "AuditTrail" DISABLE TRIGGER IF EXISTS audit_trail_prevent_delete;`)
    } catch (err) {
      // Triggers might not exist on fresh database, that's okay
      console.log('ℹ️  Triggers not found (fresh database), continuing...')
    }

    // Delete in correct order
    await prisma.$executeRawUnsafe(`DELETE FROM "Notification";`)
    await prisma.$executeRawUnsafe(`DELETE FROM "Attachment";`)
    await prisma.$executeRawUnsafe(`DELETE FROM "ApprovalStep";`)
    await prisma.$executeRawUnsafe(`DELETE FROM "Requisition";`)
    await prisma.$executeRawUnsafe(`DELETE FROM "ApprovalRule";`)
    await prisma.$executeRawUnsafe(`DELETE FROM "User";`)
    await prisma.$executeRawUnsafe(`DELETE FROM "Department";`)
    await prisma.$executeRawUnsafe(`DELETE FROM "AuditTrail";`)

    // Try to re-enable triggers if they exist
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "AuditTrail" ENABLE TRIGGER IF EXISTS audit_trail_prevent_update;`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "AuditTrail" ENABLE TRIGGER IF EXISTS audit_trail_prevent_delete;`)
    } catch (err) {
      // Triggers might not exist, that's okay
      console.log('ℹ️  Triggers not re-enabled (fresh database), continuing...')
    }

    // Create departments
    console.log('📁 Creating departments...')
    const departments = await Promise.all([
      prisma.department.create({
        data: {
          name: 'Engineering',
        },
      }),
      prisma.department.create({
        data: {
          name: 'Finance',
        },
      }),
      prisma.department.create({
        data: {
          name: 'Human Resources',
        },
      }),
      prisma.department.create({
        data: {
          name: 'Operations',
        },
      }),
    ])

    console.log(`✅ Created ${departments.length} departments`)

    // Hash passwords for each user
    console.log('🔐 Hashing passwords...')
    const adminPassword = await hashPassword('admin@123')
    const financePassword = await hashPassword('finance@123')
    const finance2Password = await hashPassword('finance2@123')
    const managerPassword = await hashPassword('manager@123')
    const manager2Password = await hashPassword('manager2@123')
    const staffPassword = await hashPassword('staff@123')
    const staff2Password = await hashPassword('staff2@123')
    const staff3Password = await hashPassword('staff3@123')

    // Create users
    console.log('👥 Creating users...')
    const users = await Promise.all([
      // Admin user
      prisma.user.create({
        data: {
          email: 'admin@techvaults.com',
          name: 'Admin User',
          password: adminPassword,
          role: 'ADMIN',
          departmentId: departments[0].id,
          isActive: true,
        },
      }),
      // Finance users
      prisma.user.create({
        data: {
          email: 'finance@techvaults.com',
          name: 'Finance Officer',
          password: financePassword,
          role: 'FINANCE',
          departmentId: departments[1].id,
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: 'finance2@techvaults.com',
          name: 'Finance Manager',
          password: finance2Password,
          role: 'FINANCE',
          departmentId: departments[1].id,
          isActive: true,
        },
      }),
      // Manager users
      prisma.user.create({
        data: {
          email: 'manager@techvaults.com',
          name: 'Engineering Manager',
          password: managerPassword,
          role: 'MANAGER',
          departmentId: departments[0].id,
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: 'manager2@techvaults.com',
          name: 'Operations Manager',
          password: manager2Password,
          role: 'MANAGER',
          departmentId: departments[3].id,
          isActive: true,
        },
      }),
      // Staff users
      prisma.user.create({
        data: {
          email: 'staff@techvaults.com',
          name: 'John Smith',
          password: staffPassword,
          role: 'STAFF',
          departmentId: departments[0].id,
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: 'staff2@techvaults.com',
          name: 'Jane Doe',
          password: staff2Password,
          role: 'STAFF',
          departmentId: departments[0].id,
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: 'staff3@techvaults.com',
          name: 'Bob Johnson',
          password: staff3Password,
          role: 'STAFF',
          departmentId: departments[3].id,
          isActive: true,
        },
      }),
    ])

    console.log(`✅ Created ${users.length} users`)

    // Create approval rules
    console.log('📋 Creating approval rules...')
    const approvalRules = await Promise.all([
      // Rule 1: 0-5000 requires manager approval
      prisma.approvalRule.create({
        data: {
          minAmount: 0,
          maxAmount: 5000,
          requiredApprovers: ['MANAGER'],
          departmentId: departments[0].id,
        },
      }),
      // Rule 2: 5000-25000 requires manager and finance
      prisma.approvalRule.create({
        data: {
          minAmount: 5000,
          maxAmount: 25000,
          requiredApprovers: ['MANAGER', 'FINANCE'],
          departmentId: departments[0].id,
        },
      }),
      // Rule 3: 25000+ requires manager, finance, and admin
      prisma.approvalRule.create({
        data: {
          minAmount: 25000,
          requiredApprovers: ['MANAGER', 'FINANCE', 'ADMIN'],
          departmentId: departments[0].id,
        },
      }),
      // Global rules for other departments
      prisma.approvalRule.create({
        data: {
          minAmount: 0,
          maxAmount: 10000,
          requiredApprovers: ['MANAGER'],
        },
      }),
      prisma.approvalRule.create({
        data: {
          minAmount: 10000,
          requiredApprovers: ['MANAGER', 'FINANCE'],
        },
      }),
    ])

    console.log(`✅ Created ${approvalRules.length} approval rules`)

    // Create sample requisitions
    console.log('📝 Creating sample requisitions...')
    const requisitions = await Promise.all([
      // Draft requisition
      prisma.requisition.create({
        data: {
          title: 'Laptop Purchase',
          category: 'IT Equipment',
          description: 'New laptop for development team',
          estimatedCost: 1500,
          businessJustification: 'Team needs updated hardware',
          status: 'DRAFT',
          submitterId: users[5].id, // staff@techvaults.com
          departmentId: departments[0].id,
          urgencyLevel: 'MEDIUM',
        },
      }),
      // Submitted requisition
      prisma.requisition.create({
        data: {
          title: 'Office Supplies',
          category: 'Supplies',
          description: 'Monthly office supplies replenishment',
          estimatedCost: 500,
          businessJustification: 'Regular office supplies needed',
          status: 'SUBMITTED',
          submitterId: users[6].id, // staff2@techvaults.com
          departmentId: departments[0].id,
          urgencyLevel: 'LOW',
        },
      }),
      // Approved requisition
      prisma.requisition.create({
        data: {
          title: 'Software License',
          category: 'Software',
          description: 'Annual software license renewal',
          estimatedCost: 3000,
          approvedCost: 3000,
          businessJustification: 'Required for development',
          status: 'APPROVED',
          submitterId: users[7].id, // staff3@techvaults.com
          departmentId: departments[3].id,
          urgencyLevel: 'HIGH',
        },
      }),
      // Paid requisition
      prisma.requisition.create({
        data: {
          title: 'Training Course',
          category: 'Training',
          description: 'Professional development course',
          estimatedCost: 2000,
          approvedCost: 2000,
          actualCostPaid: 2000,
          businessJustification: 'Skill development for team',
          status: 'PAID',
          submitterId: users[5].id,
          departmentId: departments[0].id,
          urgencyLevel: 'MEDIUM',
          paymentMethod: 'Bank Transfer',
          paymentReference: 'TXN-2024-001',
          paymentDate: new Date(),
          paymentComment: 'Payment processed successfully',
        },
      }),
    ])

    console.log(`✅ Created ${requisitions.length} sample requisitions`)

    // Create approval steps for submitted requisition
    console.log('⚙️ Creating approval steps...')
    await Promise.all([
      prisma.approvalStep.create({
        data: {
          requisitionId: requisitions[1].id,
          stepNumber: 1,
          requiredRole: 'MANAGER',
          assignedUserId: users[3].id, // manager@techvaults.com
          status: 'PENDING',
        },
      }),
      prisma.approvalStep.create({
        data: {
          requisitionId: requisitions[1].id,
          stepNumber: 2,
          requiredRole: 'FINANCE',
          assignedUserId: users[1].id, // finance@techvaults.com
          status: 'PENDING',
        },
      }),
    ])

    console.log('✅ Created approval steps')

    // Create audit trail entries
    console.log('📊 Creating audit trail entries...')
    await Promise.all([
      prisma.auditTrail.create({
        data: {
          requisitionId: requisitions[0].id,
          userId: users[5].id,
          changeType: 'CREATED',
          metadata: JSON.stringify({ action: 'Requisition created' }),
          timestamp: new Date(),
        },
      }),
      prisma.auditTrail.create({
        data: {
          requisitionId: requisitions[3].id,
          userId: users[1].id,
          changeType: 'PAYMENT_RECORDED',
          fieldName: 'actualCostPaid',
          previousValue: 'null',
          newValue: '2000',
          metadata: JSON.stringify({ paymentMethod: 'Bank Transfer' }),
          timestamp: new Date(),
        },
      }),
    ])

    console.log('✅ Created audit trail entries')

    console.log('\n✨ Database setup completed successfully!')
    console.log('\n📋 Test Credentials:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n🔐 Admin Account:')
    console.log('   Email: admin@techvaults.com')
    console.log('   Password: admin@123')
    console.log('\n💰 Finance Account:')
    console.log('   Email: finance@techvaults.com')
    console.log('   Password: finance@123')
    console.log('\n💰 Finance Manager Account:')
    console.log('   Email: finance2@techvaults.com')
    console.log('   Password: finance2@123')
    console.log('\n👔 Manager Account:')
    console.log('   Email: manager@techvaults.com')
    console.log('   Password: manager@123')
    console.log('\n👔 Operations Manager Account:')
    console.log('   Email: manager2@techvaults.com')
    console.log('   Password: manager2@123')
    console.log('\n👤 Staff Account (John):')
    console.log('   Email: staff@techvaults.com')
    console.log('   Password: staff@123')
    console.log('\n👤 Staff Account (Jane):')
    console.log('   Email: staff2@techvaults.com')
    console.log('   Password: staff2@123')
    console.log('\n👤 Staff Account (Bob):')
    console.log('   Email: staff3@techvaults.com')
    console.log('   Password: staff3@123')
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n✅ All passwords are now securely hashed in the database!')
    console.log('✅ Each user has a unique password.\n')
  } catch (error) {
    console.error('❌ Error setting up database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
