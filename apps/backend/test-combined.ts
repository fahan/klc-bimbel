import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const branch = await prisma.branch.findFirst()
  const teacher = await prisma.user.findFirst({ where: { role: 'GURU' } })
  const subject1 = await prisma.subject.findFirst()
  const subject2 = await prisma.subject.create({
    data: {
      name: 'Bahasa Indonesia',
      code: 'BI',
      trackingType: 'FREE_MATERIAL',
      maxCapacityRegular: 2,
      maxCapacityPrivate: 1,
    },
  })

  console.log('✅ Branch:', branch?.id)
  console.log('✅ Teacher:', teacher?.id)
  console.log('✅ Subject 1:', subject1?.id)
  console.log('✅ Subject 2:', subject2.id)
  
  // Create SPP rates
  const sppRate1 = await prisma.sppRate.create({
    data: {
      subjectId: subject1!.id,
      type: 'REGULAR',
      amountPerMonth: 200000,
      branchId: branch!.id,
      effectiveFrom: new Date(),
    },
  })
  
  const sppRate2 = await prisma.sppRate.create({
    data: {
      subjectId: subject2.id,
      type: 'REGULAR',
      amountPerMonth: 180000,
      branchId: branch!.id,
      effectiveFrom: new Date(),
    },
  })

  console.log('✅ SPP Rates created')
  console.log('\n📋 Ready to test combined sessions:')
  console.log(JSON.stringify({
    branchId: branch?.id,
    teacherId: teacher?.id,
    dayOfWeek: 'SENIN',
    startTime: '10:00',
    durationMinutes: 60,
    subjects: [
      { subjectId: subject1?.id, type: 'REGULAR', studentIds: [] },
      { subjectId: subject2.id, type: 'REGULAR', studentIds: [] },
    ],
  }, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
