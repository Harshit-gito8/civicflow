import { WorkOrder } from '../models/WorkOrder.js';
import { AuditLog } from '../models/AuditLog.js';
import { Incident } from '../models/Incident.js';

/**
 * Evaluates active work orders for SLA deadline warnings and breaches
 */
export async function evaluateSlaCompliance() {
  try {
    const activeWorkOrders = await WorkOrder.find({
      stage: { $in: ['DISPATCHED', 'ACCEPTED', 'ON_SITE', 'PENDING_INSPECTION', 'REWORK_REQUIRED'] },
    });

    const now = new Date();
    let warningsCount = 0;
    let breachesCount = 0;

    for (const wo of activeWorkOrders) {
      const deadline = new Date(wo.slaDeadline);
      const created = new Date(wo.createdAt);
      const totalDurationMs = deadline.getTime() - created.getTime();
      const elapsedMs = now.getTime() - created.getTime();
      const progressRatio = totalDurationMs > 0 ? elapsedMs / totalDurationMs : 1;

      if (now > deadline) {
        // SLA BREACHED!
        if (wo.slaStatus !== 'BREACHED') {
          wo.slaStatus = 'BREACHED';
          await wo.save();
          breachesCount++;

          // Create audit trail record
          await AuditLog.create({
            action: 'SLA_BREACH_DETECTED',
            performerName: 'SLA Autonomous Daemon',
            performerRole: 'SYSTEM',
            entityType: 'SLA_BREACH',
            entityId: wo.orderNumber,
            details: `Work order ${wo.orderNumber} breached SLA deadline (${deadline.toISOString()}). Automatically escalated to Department Chief.`,
            metadata: {
              allocatedHours: wo.allocatedHours,
              contractorId: wo.assignedContractorId,
            },
          });
        }
      } else if (progressRatio >= 0.75) {
        // Warning: 75% SLA time consumed
        if (wo.slaStatus === 'ON_TRACK') {
          wo.slaStatus = 'WARNING_75';
          await wo.save();
          warningsCount++;

          await AuditLog.create({
            action: 'SLA_WARNING_75',
            performerName: 'SLA Autonomous Daemon',
            performerRole: 'SYSTEM',
            entityType: 'WORK_ORDER',
            entityId: wo.orderNumber,
            details: `Work order ${wo.orderNumber} reached 75% elapsed SLA window. High-priority reminder issued.`,
          });
        }
      }
    }

    if (warningsCount > 0 || breachesCount > 0) {
      console.log(`[SLA Daemon] Scan complete: ${warningsCount} warnings, ${breachesCount} new breaches logged.`);
    }
  } catch (error) {
    console.error(`[SLA Daemon Error] ${error.message}`);
  }
}

/**
 * Starts the periodic SLA monitoring daemon
 */
export function startSlaDaemon(intervalMs = 60000) {
  console.log(`[SLA Daemon] Initialized and running every ${intervalMs / 1000}s`);
  evaluateSlaCompliance(); // run immediately on startup
  return setInterval(evaluateSlaCompliance, intervalMs);
}
