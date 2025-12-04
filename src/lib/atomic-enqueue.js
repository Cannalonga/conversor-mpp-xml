/**
 * Atomic Enqueue Service
 * 
 * Handles credit deduction and job enqueueing in a single atomic operation.
 * Uses Prisma transactions to ensure consistency.
 * 
 * Flow:
 * 1. Start transaction
 * 2. Check user credits balance
 * 3. Create CreditTransaction (deduction)
 * 4. Update UserCredits balance
 * 5. Create Job record with status 'queued'
 * 6. Commit transaction
 * 7. Add job to BullMQ queue
 * 8. Return success
 * 
 * If any step fails before commit, transaction rolls back.
 * If BullMQ add fails after commit, job stays in DB as 'queued' 
 * and can be recovered by a sweep process.
 */

const { prisma } = require('./prisma-client');
const { addConversionJob } = require('../queue/queue');
const { getBullJobOptions, getConverterCost } = require('../queues/processor-map');
const { recordMetric } = require('./metrics');

// Custom error class for insufficient credits
class InsufficientCreditsError extends Error {
    constructor(required, available) {
        super('INSUFFICIENT_CREDITS');
        this.name = 'InsufficientCreditsError';
        this.code = 'INSUFFICIENT_CREDITS';
        this.required = required;
        this.available = available;
    }
}

/**
 * Charge credits and enqueue a conversion job atomically
 * 
 * @param {object} params
 * @param {string} params.userId - User's ID
 * @param {string} params.converterId - Converter ID (e.g., 'mpp-to-xml')
 * @param {number} params.cost - Credits to charge (optional, defaults to converter cost)
 * @param {object} params.payload - Job payload { inputPath, metadata, ... }
 * @returns {Promise<{success: boolean, jobId?: string, bullId?: string, error?: string}>}
 */
async function chargeAndEnqueue({ userId, converterId, cost, payload }) {
    // Get cost from config if not provided
    const creditCost = cost ?? getConverterCost(converterId);
    
    console.log(`[AtomicEnqueue] Starting for user=${userId}, converter=${converterId}, cost=${creditCost}`);

    let createdJob;

    try {
        // Execute database transaction
        createdJob = await prisma.$transaction(async (tx) => {
            // 1. Get user's current credits (with implicit lock in transaction)
            const userCredits = await tx.userCredits.findUnique({
                where: { userId }
            });

            // 2. Check if user has credits record
            if (!userCredits) {
                console.log(`[AtomicEnqueue] User ${userId} has no credits record`);
                throw new InsufficientCreditsError(creditCost, 0);
            }

            // 3. Check if balance is sufficient
            if (userCredits.balance < creditCost) {
                console.log(`[AtomicEnqueue] Insufficient credits: has ${userCredits.balance}, needs ${creditCost}`);
                throw new InsufficientCreditsError(creditCost, userCredits.balance);
            }

            console.log(`[AtomicEnqueue] Balance OK: ${userCredits.balance} >= ${creditCost}`);

            // 4. Create credit transaction (deduction)
            await tx.creditTransaction.create({
                data: {
                    userId,
                    amount: -creditCost,
                    type: 'CONVERSION',
                    description: `Charge for ${converterId} conversion`,
                    metadata: JSON.stringify({
                        converterId,
                        inputPath: payload.inputPath || null
                    })
                }
            });

            // 5. Update user's balance
            await tx.userCredits.update({
                where: { userId },
                data: { 
                    balance: { decrement: creditCost } 
                }
            });

            // 6. Create job record
            const job = await tx.job.create({
                data: {
                    userId,
                    converterId,
                    status: 'queued',
                    progress: 0,
                    inputPath: payload.inputPath || null,
                    cost: creditCost,
                    metadata: JSON.stringify({
                        originalFilename: payload.originalFilename,
                        mimeType: payload.mimeType,
                        fileSize: payload.fileSize,
                        options: payload.options || {}
                    })
                }
            });

            console.log(`[AtomicEnqueue] Job ${job.id} created, credits deducted`);

            return job;
        }, {
            // Transaction options
            maxWait: 5000,     // Max wait time to acquire lock
            timeout: 10000    // Max execution time
        });

        // Transaction committed successfully
        // Now enqueue to BullMQ (outside transaction)
        
        const bullJobOptions = getBullJobOptions(converterId);
        
        const bullJob = await addConversionJob(converterId, {
            jobId: createdJob.id,
            userId,
            payload
        }, bullJobOptions);

        // Record metric
        recordMetric('enqueued', converterId);

        console.log(`[AtomicEnqueue] Success: jobId=${createdJob.id}, bullId=${bullJob.id}`);

        return {
            success: true,
            jobId: createdJob.id,
            bullId: bullJob.id,
            status: 'queued',
            creditsCharged: creditCost,
            newBalance: await getUserBalance(userId)
        };

    } catch (error) {
        // Handle specific errors
        if (error.code === 'INSUFFICIENT_CREDITS') {
            console.log(`[AtomicEnqueue] Failed: insufficient credits`);
            return {
                success: false,
                error: 'INSUFFICIENT_CREDITS',
                required: error.required,
                available: error.available
            };
        }

        // Log and rethrow other errors
        console.error(`[AtomicEnqueue] Error:`, error.message);
        
        // If job was created but BullMQ failed, we need to handle recovery
        if (createdJob) {
            console.error(`[AtomicEnqueue] Job ${createdJob.id} created but BullMQ enqueue failed!`);
            // Mark job as needing recovery
            try {
                await prisma.job.update({
                    where: { id: createdJob.id },
                    data: {
                        status: 'queued', // Keep as queued for sweep process
                        metadata: JSON.stringify({
                            ...(createdJob.metadata ? JSON.parse(createdJob.metadata) : {}),
                            bullEnqueueFailed: true,
                            failedAt: new Date().toISOString(),
                            error: error.message
                        })
                    }
                });
            } catch (updateErr) {
                console.error(`[AtomicEnqueue] Failed to mark job for recovery:`, updateErr.message);
            }
        }

        return {
            success: false,
            error: error.message || 'ENQUEUE_FAILED'
        };
    }
}

/**
 * Refund credits for a failed job
 * 
 * @param {string} userId 
 * @param {string} jobId 
 * @param {number} amount 
 * @param {string} reason 
 */
async function refundCredits(userId, jobId, amount, reason = 'Job failed') {
    console.log(`[AtomicEnqueue] Refunding ${amount} credits to user ${userId} for job ${jobId}`);

    try {
        await prisma.$transaction(async (tx) => {
            // Create refund transaction
            await tx.creditTransaction.create({
                data: {
                    userId,
                    amount: amount, // Positive = refund
                    type: 'REFUND',
                    description: `Refund for job ${jobId}: ${reason}`,
                    metadata: JSON.stringify({ jobId, reason })
                }
            });

            // Update balance
            await tx.userCredits.update({
                where: { userId },
                data: { balance: { increment: amount } }
            });
        });

        console.log(`[AtomicEnqueue] Refund successful`);
        return { success: true };

    } catch (error) {
        console.error(`[AtomicEnqueue] Refund failed:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get user's current balance
 */
async function getUserBalance(userId) {
    const credits = await prisma.userCredits.findUnique({
        where: { userId }
    });
    return credits?.balance || 0;
}

/**
 * Check if user can afford a conversion
 */
async function canAfford(userId, converterId) {
    const cost = getConverterCost(converterId);
    const balance = await getUserBalance(userId);
    return balance >= cost;
}

/**
 * Sweep for jobs stuck in 'queued' that need re-enqueue
 * (Recovery process for BullMQ failures)
 */
async function sweepStuckJobs(maxAge = 5 * 60 * 1000) {
    const cutoff = new Date(Date.now() - maxAge);
    
    const stuckJobs = await prisma.job.findMany({
        where: {
            status: 'queued',
            createdAt: { lt: cutoff }
        },
        take: 100
    });

    console.log(`[AtomicEnqueue] Found ${stuckJobs.length} potentially stuck jobs`);

    for (const job of stuckJobs) {
        try {
            const metadata = job.metadata ? JSON.parse(job.metadata) : {};
            
            // Try to re-enqueue
            const bullJob = await addConversionJob(job.converterId, {
                jobId: job.id,
                userId: job.userId,
                payload: {
                    inputPath: job.inputPath,
                    ...metadata
                }
            }, getBullJobOptions(job.converterId));

            console.log(`[AtomicEnqueue] Re-enqueued stuck job ${job.id} as ${bullJob.id}`);

        } catch (error) {
            console.error(`[AtomicEnqueue] Failed to re-enqueue job ${job.id}:`, error.message);
        }
    }

    return stuckJobs.length;
}

module.exports = {
    chargeAndEnqueue,
    refundCredits,
    getUserBalance,
    canAfford,
    sweepStuckJobs,
    InsufficientCreditsError
};
