/**
 * Setup Test User with Credits
 */
const { PrismaClient } = require('../frontend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function setup() {
    console.log('Setting up test user...');
    
    // Create a test user
    const user = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
            email: 'test@example.com',
            name: 'Test User',
            password: 'hashed_password_here'
        }
    });
    console.log('User ID:', user.id);
    
    // Create credits for user
    const credits = await prisma.userCredits.upsert({
        where: { userId: user.id },
        update: { balance: 100 },
        create: {
            userId: user.id,
            balance: 100
        }
    });
    console.log('Credits Balance:', credits.balance);
    
    console.log('\n=== Test User Ready ===');
    console.log('Use this userId in API calls:', user.id);
    
    await prisma.$disconnect();
}

setup().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
