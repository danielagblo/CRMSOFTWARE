import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)

  const user = await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@crm.com',
      password: hashedPassword,
      role: 'ADMIN'
    }
  })

  console.log('Created user:', user)

  // Create some sample leads for the admin user
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        clientName: 'John Doe',
        companyName: 'Tech Corp',
        phone: '+1234567890',
        email: 'john@techcorp.com',
        serviceInterested: 'Web Development',
        dealValue: 5000,
        notes: 'Interested in a new website',
        assignedTo: user.id,
        createdBy: user.id,
        stage: 'CONTACT_CLIENT'
      }
    }),
    prisma.lead.create({
      data: {
        clientName: 'Jane Smith',
        companyName: 'Marketing Inc',
        phone: '+1234567891',
        email: 'jane@marketinginc.com',
        serviceInterested: 'Digital Marketing',
        dealValue: 3000,
        notes: 'Needs social media campaign',
        assignedTo: user.id,
        createdBy: user.id,
        stage: 'PRESENT_SERVICE'
      }
    }),
    prisma.lead.create({
      data: {
        clientName: 'Bob Johnson',
        companyName: 'Consulting LLC',
        phone: '+1234567892',
        email: 'bob@consulting.com',
        serviceInterested: 'Business Consulting',
        dealValue: 8000,
        notes: 'Looking for strategic advice',
        assignedTo: user.id,
        createdBy: user.id,
        stage: 'NEGOTIATE'
      }
    })
  ])

  console.log('Created leads:', leads.length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })