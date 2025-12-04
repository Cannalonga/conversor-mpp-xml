/**
 * Prisma Client Singleton
 * 
 * Provides a shared Prisma client instance for database operations.
 * Uses the frontend's Prisma client and schema.
 */

// Use the Prisma client from frontend's node_modules
const { PrismaClient } = require('../../frontend/node_modules/@prisma/client');

// Global singleton to prevent multiple instances in development
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
        ? ['error', 'warn'] 
        : ['error'],
    datasources: {
        db: {
            // Use absolute path to frontend's dev.db
            url: `file:${require('path').resolve(__dirname, '../../frontend/prisma/dev.db')}`
        }
    }
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

/**
 * Gracefully disconnect Prisma
 */
async function disconnectPrisma() {
    await prisma.$disconnect();
    console.log('[Prisma] Disconnected');
}

/**
 * Health check for database
 */
async function dbHealthCheck() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return { healthy: true };
    } catch (err) {
        return { healthy: false, error: err.message };
    }
}

module.exports = {
    prisma,
    disconnectPrisma,
    dbHealthCheck
};
