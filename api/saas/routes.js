/**
 * SaaS Routes
 * 
 * Endpoints para fluxo multi-tenant
 */

const express = require('express');
const router = express.Router();

const {
  UserController,
  SubscriptionController,
  UsageController,
  BillingController,
} = require('./controllers');

const {
  validateSaasToken,
  validateResourceAccess,
  validateConversionLimit,
  rateLimitByUser,
} = require('./middleware');

/**
 * User Routes
 */
router.post('/users/register', (req, res) => {
  UserController.register(req, res);
});

router.get('/users/profile', validateSaasToken, validateResourceAccess, (req, res) => {
  UserController.getProfile(req, res);
});

router.put('/users/profile', validateSaasToken, validateResourceAccess, (req, res) => {
  UserController.updateProfile(req, res);
});

router.get('/users/list', validateSaasToken, (req, res) => {
  UserController.listUsers(req, res);
});

/**
 * Subscription Routes
 */
router.get('/subscriptions/active', validateSaasToken, (req, res) => {
  SubscriptionController.getActive(req, res);
});

router.post('/subscriptions/upgrade', validateSaasToken, rateLimitByUser, (req, res) => {
  SubscriptionController.upgrade(req, res);
});

router.get('/subscriptions/list', validateSaasToken, (req, res) => {
  SubscriptionController.listActive(req, res);
});

/**
 * Usage Routes
 */
router.get('/usage/current', validateSaasToken, (req, res) => {
  UsageController.getCurrent(req, res);
});

router.get('/usage/history', validateSaasToken, (req, res) => {
  UsageController.getHistory(req, res);
});

router.get('/usage/dashboard', validateSaasToken, (req, res) => {
  UsageController.getDashboard(req, res);
});

/**
 * Billing Routes
 */
router.get('/billing/invoices', validateSaasToken, (req, res) => {
  BillingController.getInvoices(req, res);
});

router.get('/billing/pending', validateSaasToken, (req, res) => {
  BillingController.getPendingInvoices(req, res);
});

router.get('/billing/revenue', validateSaasToken, (req, res) => {
  BillingController.getRevenue(req, res);
});

router.get('/billing/report', validateSaasToken, (req, res) => {
  BillingController.getReport(req, res);
});

module.exports = router;

router.get('/billing/report', (req, res) => {
  BillingController.getReport(req, res);
});

module.exports = router;
