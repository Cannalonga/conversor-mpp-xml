const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== REFUND TABLES CHECK ===\n');
  
  // Count records
  const refundRequests = await prisma.refundRequest.count();
  const refundRecoveries = await prisma.refundRecovery.count();
  const users = await prisma.user.count();
  
  console.log('RefundRequest count:', refundRequests);
  console.log('RefundRecovery count:', refundRecoveries);
  console.log('User count:', users);
  
  console.log('\n=== CREATING TEST DATA ===\n');
  
  // Find or create a test user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'refund-test@example.com',
        name: 'Refund Test User',
      }
    });
    console.log('Created test user:', user.id);
  } else {
    console.log('Using existing user:', user.id);
  }
  
  // Create test RefundRequest
  const testRequest = await prisma.refundRequest.create({
    data: {
      userId: user.id,
      jobId: 'test-job-' + Date.now(),
      amount: 1,
      reason: 'Test refund request for validation - ' + new Date().toISOString(),
      status: 'PENDING',
      failureStage: 'PRE_PROCESS',
      autoRefund: false,
    }
  });
  console.log('Created RefundRequest:', testRequest.id);
  
  // List all pending requests
  console.log('\n=== PENDING REFUND REQUESTS ===\n');
  const pending = await prisma.refundRequest.findMany({
    where: { status: 'PENDING' },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  
  for (const req of pending) {
    console.log(`ID: ${req.id}`);
    console.log(`  User: ${req.user?.email || req.userId}`);
    console.log(`  Job: ${req.jobId}`);
    console.log(`  Amount: ${req.amount} credits`);
    console.log(`  Reason: ${req.reason}`);
    console.log(`  Status: ${req.status}`);
    console.log(`  Created: ${req.createdAt}`);
    console.log('---');
  }
  
  console.log('\n✓ Database validation complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
