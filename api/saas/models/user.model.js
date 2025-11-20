/**
 * SaaS User Model
 * 
 * Representa um cliente/usuário do platform
 * Independente do admin único
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class UserModel {
  /**
   * Criar novo usuário/cliente
   */
  async create(userData) {
    try {
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          cpf: userData.cpf,
          status: 'active',
          tier: userData.tier || 'free',
          createdAt: new Date(),
          metadata: JSON.stringify(userData.metadata || {}),
        },
      });

      console.log(`✅ User created: ${user.id} (${user.email})`);
      return user;
    } catch (error) {
      console.error('[UserModel] Create error:', error);
      throw error;
    }
  }

  /**
   * Buscar usuário por ID
   */
  async findById(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: true,
          usage: true,
        },
      });
      return user;
    } catch (error) {
      console.error('[UserModel] FindById error:', error);
      throw error;
    }
  }

  /**
   * Buscar usuário por email
   */
  async findByEmail(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          subscriptions: { where: { status: 'active' } },
          usage: { where: { month: new Date().toISOString().slice(0, 7) } },
        },
      });
      return user;
    } catch (error) {
      console.error('[UserModel] FindByEmail error:', error);
      throw error;
    }
  }

  /**
   * Atualizar usuário
   */
  async update(userId, updateData) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
      return user;
    } catch (error) {
      console.error('[UserModel] Update error:', error);
      throw error;
    }
  }

  /**
   * Listar todos os usuários (admin)
   */
  async list(limit = 50, offset = 0) {
    try {
      const users = await prisma.user.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: { subscriptions: true },
      });
      return users;
    } catch (error) {
      console.error('[UserModel] List error:', error);
      throw error;
    }
  }

  /**
   * Contar usuários por tier
   */
  async countByTier() {
    try {
      const counts = await prisma.user.groupBy({
        by: ['tier'],
        _count: {
          id: true,
        },
      });

      return counts.map(g => ({
        tier: g.tier,
        count: g._count.id,
      }));
    } catch (error) {
      console.error('[UserModel] CountByTier error:', error);
      throw error;
    }
  }
}

module.exports = new UserModel();
