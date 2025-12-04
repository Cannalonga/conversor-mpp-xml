// Check user balance
const { prisma } = require('./src/lib/prisma-client');

prisma.userCredits.findUnique({
    where: { userId: 'cmiqzo42u0000ey62xmk8td2u' }
}).then(c => {
    console.log('Current Balance:', c ? c.balance : 'No credits found');
    return prisma.job.findMany({
        where: { userId: 'cmiqzo42u0000ey62xmk8td2u' },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
}).then(jobs => {
    console.log('\nRecent Jobs:');
    jobs.forEach(j => {
        console.log(`  - ${j.id}: ${j.status} (converter: ${j.converterId})`);
    });
    return prisma.$disconnect();
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
