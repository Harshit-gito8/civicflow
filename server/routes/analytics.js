import express from 'express';
import { Incident } from '../models/Incident.js';
import { WorkOrder } from '../models/WorkOrder.js';
import { AuditLog } from '../models/AuditLog.js';

const router = express.Router();

// @route   GET /api/analytics/overview
// @desc    High-level municipal KPI dashboard metrics
router.get('/overview', async (req, res) => {
  try {
    const totalIncidents = await Incident.countDocuments({ isMasterTicket: true });
    const resolvedIncidents = await Incident.countDocuments({ isMasterTicket: true, status: 'RESOLVED' });
    const inProgressIncidents = await Incident.countDocuments({
      isMasterTicket: true,
      status: { $in: ['WORK_ORDER_CREATED', 'IN_PROGRESS'] },
    });
    const pendingTriage = await Incident.countDocuments({ isMasterTicket: true, status: 'REPORTED' });

    const totalWorkOrders = await WorkOrder.countDocuments();
    const approvedWorkOrders = await WorkOrder.countDocuments({ stage: 'APPROVED' });
    const breachedWorkOrders = await WorkOrder.countDocuments({ slaStatus: 'BREACHED' });
    const geofenceViolations = await AuditLog.countDocuments({ action: 'GEOFENCE_FRAUD_REJECTED' });

    // Calculate SLA Compliance Rate
    const slaComplianceRate =
      totalWorkOrders > 0
        ? Math.round(((totalWorkOrders - breachedWorkOrders) / totalWorkOrders) * 100)
        : 100;

    const resolutionRate =
      totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0;

    // Financial totals
    const budgetAgg = await WorkOrder.aggregate([
      { $match: { stage: 'APPROVED' } },
      { $group: { _id: null, totalApproved: { $sum: '$approvedCost' } } },
    ]);
    const totalBudgetApproved = budgetAgg.length > 0 ? budgetAgg[0].totalApproved : 0;

    res.json({
      success: true,
      kpis: {
        totalIncidents,
        resolvedIncidents,
        inProgressIncidents,
        pendingTriage,
        resolutionRate,
        totalWorkOrders,
        approvedWorkOrders,
        breachedWorkOrders,
        slaComplianceRate,
        geofenceViolationsPrevented: geofenceViolations,
        totalBudgetApproved,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/wards
// @desc    Ward-by-ward civic health breakdown
router.get('/wards', async (req, res) => {
  try {
    const wardData = await Incident.aggregate([
      { $match: { isMasterTicket: true } },
      {
        $group: {
          _id: '$wardNumber',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severityLevel', 'CRITICAL'] }, 1, 0] } },
          avgPriorityScore: { $avg: '$calculatedPriorityScore' },
          totalReports: { $sum: '$reportCount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      wards: wardData.map((w) => ({
        wardNumber: w._id,
        total: w.total,
        resolved: w.resolved,
        pending: w.total - w.resolved,
        critical: w.critical,
        avgPriorityScore: Math.round(w.avgPriorityScore || 0),
        totalReports: w.totalReports,
        resolutionRate: w.total > 0 ? Math.round((w.resolved / w.total) * 100) : 0,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/categories
// @desc    Breakdown by defect category
router.get('/categories', async (req, res) => {
  try {
    const categories = await Incident.aggregate([
      { $match: { isMasterTicket: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalReports: { $sum: '$reportCount' },
          resolvedCount: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      categories: categories.map((c) => ({
        category: c._id,
        count: c.count,
        totalReports: c.totalReports,
        resolvedCount: c.resolvedCount,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/analytics/audit-logs
// @desc    Get immutable audit log feed
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
