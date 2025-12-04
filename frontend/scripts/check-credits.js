const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== USER CREDITS ===\n');
  
  const userCredits = await prisma.userCredits.findMany({
    include: { user: { select: { email: true, name: true } } },
    orderBy: { balance: 'desc' },
  });
  
  console.log('UserId                          | Email                    | Balance');
  console.log('-'.repeat(80));
  
  for (const uc of userCredits) {
    console.log(`${uc.userId} | ${(uc.user?.email || 'N/A').padEnd(24)} | ${uc.balance} credits`);
  }
  
  console.log('\n=== REFUND SUMMARY ===\n');
  
  const pending = await prisma.refundRequest.count({ where: { status: 'PENDING' } });
  const approved = await prisma.refundRequest.count({ where: { status: 'APPROVED' } });
  const rejected = await prisma.refundRequest.count({ where: { status: 'REJECTED' } });
  const recoveries = await prisma.refundRecovery.count();
  
  console.log(`PENDING:  ${pending}`);
  console.log(`APPROVED: ${approved}`);
  console.log(`REJECTED: ${rejected}`);
  console.log(`RECOVERY: ${recoveries}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
