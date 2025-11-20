/**
 * SaaS Controllers
 * 
 * Endpoints para gerenciar usuários, planos, uso e faturamento
 */

const {
  UserRepository,
  SubscriptionRepository,
  UsageRepository,
  BillingRepository,
} = require('./repositories');

/**
 * User Controller
 */
class UserController {
  async register(req, res) {
    try {
      const { email, name, cpf } = req.body;

      // Validar entrada
      if (!email || !name) {
        return res.status(400).json({
          error: 'Email and name are required',
        });
      }

      // Criar usuário
      const user = await UserRepository.create({
        email,
        name,
        cpf,
      });

      // Criar plano free por padrão
      await SubscriptionRepository.create({
        userId: user.id,
        planType: 'free',
      });

      return res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      console.error('[UserController] Register error:', error);
      
      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Email already registered',
        });
      }

      res.status(500).json({
        error: 'Failed to register user',
      });
    }
  }

  async getProfile(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await UserRepository.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('[UserController] GetProfile error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user?.id;
      const { name, metadata } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await UserRepository.update(userId, {
        ...(name && { name }),
        ...(metadata && { metadata: JSON.stringify(metadata) }),
      });

      res.json(user);
    } catch (error) {
      console.error('[UserController] UpdateProfile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  async listUsers(req, res) {
    try {
      // Only admin can list users
      if (req.admin?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const users = await UserRepository.list(limit, offset);
      const tierStats = await UserRepository.countByTier();

      res.json({
        users,
        stats: tierStats,
      });
    } catch (error) {
      console.error('[UserController] ListUsers error:', error);
      res.status(500).json({ error: 'Failed to list users' });
    }
  }
}

/**
 * Subscription Controller
 */
class SubscriptionController {
  async getActive(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const subscription = await SubscriptionRepository.getActive(userId);

      res.json(subscription || {
        planType: 'free',
        conversionsLimit: 3,
      });
    } catch (error) {
      console.error('[SubscriptionController] GetActive error:', error);
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  }

  async upgrade(req, res) {
    try {
      const userId = req.user?.id;
      const { planType } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!['pro', 'enterprise'].includes(planType)) {
        return res.status(400).json({ error: 'Invalid plan type' });
      }

      const subscription = await SubscriptionRepository.upgrade(userId, planType);

      // Create invoice for first month
      const price = SubscriptionRepository.getPriceForPlan(planType);
      if (price > 0) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        await BillingRepository.createInvoice({
          userId,
          subscriptionId: subscription.id,
          amount: price,
          dueDate,
          description: `Subscription upgrade to ${planType}`,
        });
      }

      res.json({
        success: true,
        subscription,
      });
    } catch (error) {
      console.error('[SubscriptionController] Upgrade error:', error);
      res.status(500).json({ error: 'Failed to upgrade subscription' });
    }
  }

  async listActive(req, res) {
    try {
      if (req.admin?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const subscriptions = await SubscriptionRepository.listActive(limit, offset);
      const planStats = await SubscriptionRepository.countByPlan();

      res.json({
        subscriptions,
        stats: planStats,
      });
    } catch (error) {
      console.error('[SubscriptionController] ListActive error:', error);
      res.status(500).json({ error: 'Failed to list subscriptions' });
    }
  }
}

/**
 * Usage Controller
 */
class UsageController {
  async getCurrent(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const usage = await UsageRepository.getCurrentUsage(userId);
      const canConvert = await UsageRepository.canConvert(userId);

      res.json({
        ...usage,
        canConvert,
      });
    } catch (error) {
      console.error('[UsageController] GetCurrent error:', error);
      res.status(500).json({ error: 'Failed to fetch usage' });
    }
  }

  async getHistory(req, res) {
    try {
      const userId = req.user?.id;
      const months = parseInt(req.query.months) || 12;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const history = await UsageRepository.getHistory(userId, months);

      res.json(history);
    } catch (error) {
      console.error('[UsageController] GetHistory error:', error);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  }

  async getDashboard(req, res) {
    try {
      if (req.admin?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const dashboard = await UsageRepository.getDashboard();

      res.json(dashboard);
    } catch (error) {
      console.error('[UsageController] GetDashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  }
}

/**
 * Billing Controller
 */
class BillingController {
  async getInvoices(req, res) {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const invoices = await BillingRepository.getUserInvoices(userId, limit, offset);

      res.json(invoices);
    } catch (error) {
      console.error('[BillingController] GetInvoices error:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  }

  async getPendingInvoices(req, res) {
    try {
      if (req.admin?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const invoices = await BillingRepository.getPendingInvoices(limit, offset);

      res.json(invoices);
    } catch (error) {
      console.error('[BillingController] GetPendingInvoices error:', error);
      res.status(500).json({ error: 'Failed to fetch pending invoices' });
    }
  }

  async getRevenue(req, res) {
    try {
      if (req.admin?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const revenue = await BillingRepository.getRevenueDashboard();

      res.json(revenue);
    } catch (error) {
      console.error('[BillingController] GetRevenue error:', error);
      res.status(500).json({ error: 'Failed to fetch revenue' });
    }
  }

  async getReport(req, res) {
    try {
      if (req.admin?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate are required',
        });
      }

      const report = await BillingRepository.getReport(startDate, endDate);

      res.json(report);
    } catch (error) {
      console.error('[BillingController] GetReport error:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
}

module.exports = {
  UserController: new UserController(),
  SubscriptionController: new SubscriptionController(),
  UsageController: new UsageController(),
  BillingController: new BillingController(),
};
