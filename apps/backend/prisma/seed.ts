import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const hashedPassword = await bcrypt.hash('password', 12)

  // Create test branch
  const branch = await prisma.branch.create({
    data: {
      name: 'Purwokerto',
      code: 'PWK',
      address: 'Jl. Gajah Mada No. 123',
      phone: '0281-123456',
    },
  })
  console.log('✅ Created branch:', branch.name)

  // Create test users
  const users: Array<{
    name: string
    email: string
    password: string
    phone: string
    role: Role
  }> = [
    {
      name: 'Owner Admin',
      email: 'owner@bimbel.com',
      password: hashedPassword,
      phone: '08123456789',
      role: 'OWNER',
    },
    {
      name: 'Admin Global',
      email: 'admin@bimbel.com',
      password: hashedPassword,
      phone: '08234567890',
      role: 'ADMIN_GLOBAL',
    },
    {
      name: 'Admin Cabang',
      email: 'admin-cabang@bimbel.com',
      password: hashedPassword,
      phone: '08345678901',
      role: 'ADMIN_CABANG',
    },
    {
      name: 'Guru Matematika',
      email: 'guru@bimbel.com',
      password: hashedPassword,
      phone: '08456789012',
      role: 'GURU',
    },
  ]

  for (const userData of users) {
    const user = await prisma.user.create({
      data: userData,
    })
    console.log(`✅ Created user: ${user.email} (${user.role})`)

    // Add user to branch
    if (user.role !== 'OWNER' && user.role !== 'ADMIN_GLOBAL') {
      await prisma.userBranch.create({
        data: {
          userId: user.id,
          branchId: branch.id,
          isPrimary: true,
        },
      })
    }
  }

  // Create test subject
  const subject = await prisma.subject.create({
    data: {
      name: 'Matematika',
      code: 'MTK',
      trackingType: 'FREE_MATERIAL',
      maxCapacityRegular: 3,
      maxCapacityPrivate: 1,
    },
  })
  console.log('✅ Created subject:', subject.name)

  // Create test students
  const students = []
  for (let i = 1; i <= 5; i++) {
    const student = await prisma.student.create({
      data: {
        name: `Siswa ${i}`,
        branchId: branch.id,
        classLevel: `8 SMP`,
        parentName: `Orang Tua ${i}`,
        parentPhone: `0812345678${i}`,
        registeredAt: new Date(),
      },
    })
    students.push(student)
  }
  console.log(`✅ Created ${students.length} test students`)

  console.log('\n✨ Seeding completed successfully!')
  console.log('\nTest Credentials:')
  console.log('  Owner:     owner@bimbel.com / password')
  console.log('  Admin:     admin@bimbel.com / password')
  console.log('  Admin CB:  admin-cabang@bimbel.com / password')
  console.log('  Guru:      guru@bimbel.com / password')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
