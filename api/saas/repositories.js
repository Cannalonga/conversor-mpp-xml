/**
 * SaaS Repositories
 * 
 * CRUD operations para modelos SaaS
 */

const UserModel = require('./models/user.model');
const SubscriptionModel = require('./models/subscription.model');
const UsageModel = require('./models/usage.model');
const BillingModel = require('./models/billing.model');

/**
 * User Repository
 */
class UserRepository {
  async create(userData) {
    return UserModel.create(userData);
  }

  async findById(userId) {
    return UserModel.findById(userId);
  }

  async findByEmail(email) {
    return UserModel.findByEmail(email);
  }

  async update(userId, updateData) {
    return UserModel.update(userId, updateData);
  }

  async list(limit, offset) {
    return UserModel.list(limit, offset);
  }

  async countByTier() {
    return UserModel.countByTier();
  }
}

/**
 * Subscription Repository
 */
class SubscriptionRepository {
  async create(subscriptionData) {
    return SubscriptionModel.create(subscriptionData);
  }

  async getActive(userId) {
    return SubscriptionModel.getActiveSubscription(userId);
  }

  async upgrade(userId, newPlanType) {
    return SubscriptionModel.upgrade(userId, newPlanType);
  }

  async cancel(subscriptionId) {
    return SubscriptionModel.cancel(subscriptionId);
  }

  async listActive(limit, offset) {
    return SubscriptionModel.listActive(limit, offset);
  }

  async countByPlan() {
    return SubscriptionModel.countByPlan();
  }

  getLimitForPlan(planType) {
    return SubscriptionModel.getLimitForPlan(planType);
  }

  getPriceForPlan(planType) {
    return SubscriptionModel.getPriceForPlan(planType);
  }
}

/**
 * Usage Repository
 */
class UsageRepository {
  async logConversion(userId, conversionData) {
    return UsageModel.logConversion(userId, conversionData);
  }

  async getCurrentUsage(userId) {
    return UsageModel.getCurrentUsage(userId);
  }

  async canConvert(userId) {
    return UsageModel.canConvert(userId);
  }

  async getHistory(userId, months) {
    return UsageModel.getHistory(userId, months);
  }

  async getDashboard() {
    return UsageModel.getDashboard();
  }
}

/**
 * Billing Repository
 */
class BillingRepository {
  async createInvoice(invoiceData) {
    return BillingModel.createInvoice(invoiceData);
  }

  async markAsPaid(invoiceId, paymentData) {
    return BillingModel.markAsPaid(invoiceId, paymentData);
  }

  async getUserInvoices(userId, limit, offset) {
    return BillingModel.getUserInvoices(userId, limit, offset);
  }

  async getPendingInvoices(limit, offset) {
    return BillingModel.getPendingInvoices(limit, offset);
  }

  async getRevenueDashboard() {
    return BillingModel.getRevenueDashboard();
  }

  async getReport(startDate, endDate) {
    return BillingModel.getReport(startDate, endDate);
  }
}

module.exports = {
  UserRepository: new UserRepository(),
  SubscriptionRepository: new SubscriptionRepository(),
  UsageRepository: new UsageRepository(),
  BillingRepository: new BillingRepository(),
};
