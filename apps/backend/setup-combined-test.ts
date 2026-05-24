import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get existing data
  const branch = await prisma.branch.findFirst()
  const subject1 = await prisma.subject.findFirst()
  
  // Create second subject
  const subject2 = await prisma.subject.create({
    data: {
      name: 'Bahasa Indonesia',
      code: 'BI',
      trackingType: 'FREE_MATERIAL',
      maxCapacityRegular: 2,
      maxCapacityPrivate: 1,
    },
  })

  // Create SPP rates for both subjects
  const sppRate1 = await prisma.sppRate.create({
    data: {
      subjectId: subject1!.id,
      type: 'REGULAR',
      amount: 200000,
      effectiveFrom: new Date(),
    },
  })
  
  const sppRate2 = await prisma.sppRate.create({
    data: {
      subjectId: subject2.id,
      type: 'REGULAR',
      amount: 180000,
      effectiveFrom: new Date(),
    },
  })

  console.log('\n✅ Setup Complete! Ready for combined session testing:\n')
  console.log(JSON.stringify({
    branchId: branch?.id,
    teacherId: (await prisma.user.findFirst({ where: { role: 'GURU' } }))?.id,
    dayOfWeek: 'SENIN',
    startTime: '10:00',
    durationMinutes: 60,
    subjects: [
      {
        subjectId: subject1?.id,
        type: 'REGULAR',
        studentIds: [(await prisma.student.findFirst())?.id],
      },
      {
        subjectId: subject2.id,
        type: 'REGULAR',
        studentIds: [(await prisma.student.findFirst({ skip: 1 }))?.id],
      },
    ],
  }, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
