/**
 * Database Initialization & Migration Helper
 * ============================================
 * 
 * Propósito: Gerenciar Prisma Client, migrations e operações do banco
 * 
 * Uso:
 * - npm run migrate     // Aplicar migrations
 * - npm run prisma studio // UI Prisma para gerenciar dados
 */

const { PrismaClient } = require('@prisma/client');

// Inicializar cliente com logging
const prisma = new PrismaClient({
  log: [
    { emit: 'stdout', level: 'query' },    // Log de queries
    { emit: 'stdout', level: 'error' },    // Log de erros
    { emit: 'stdout', level: 'warn' },     // Log de avisos
  ],
});

/**
 * Seed: Inicializar dados do banco
 * Executar: npx prisma db seed
 */
async function seedDatabase() {
  console.log('🌱 Iniciando seed do banco de dados...');
  
  try {
    // Criar admin padrão
    const adminUser = await prisma.adminUser.upsert({
      where: { username: 'Alcap0ne' },
      update: {},
      create: {
        username: 'Alcap0ne',
        email: 'rafaelcannalonga2@hotmail.com',
        passwordHash: '$2b$12$lMykd5ItQQ8EzS4VEbkcCe1j2Q8ZjGDr73uEt76V9r6hYdIgProju',
        role: 'SUPER_ADMIN',
        isActive: true,
        twoFactorEnabled: false,
      },
    });
    
    console.log('✅ Admin criado:', adminUser);
    
  } catch (e) {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  }
}

/**
 * Health Check: Verificar conexão com banco
 */
async function healthCheck() {
  try {
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Banco de dados conectado com sucesso');
    return true;
  } catch (e) {
    console.error('❌ Erro na conexão:', e.message);
    return false;
  }
}

/**
 * Cleanup: Desconectar Prisma
 */
async function disconnect() {
  await prisma.$disconnect();
}

// Exportar
module.exports = {
  prisma,
  seedDatabase,
  healthCheck,
  disconnect,
};

// Executar seed se for chamado diretamente
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
