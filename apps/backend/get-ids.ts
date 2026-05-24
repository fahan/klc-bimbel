import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const branch = await prisma.branch.findFirst()
  const teacher = await prisma.user.findFirst({ where: { role: 'GURU' } })
  const subjects = await prisma.subject.findMany({ take: 2 })
  const students = await prisma.student.findMany({ take: 3 })

  console.log('\n✅ Test Data IDs:')
  console.log('Branch ID:', branch?.id)
  console.log('Teacher ID:', teacher?.id)
  console.log('Subject 1:', subjects[0]?.id, '-', subjects[0]?.name)
  if(subjects[1]) console.log('Subject 2:', subjects[1]?.id, '-', subjects[1]?.name)
  console.log('\nStudent IDs:')
  students.forEach((s, i) => console.log(`  ${i+1}. ${s.id} - ${s.name}`))
}

main().catch(console.error).finally(() => prisma.$disconnect())
