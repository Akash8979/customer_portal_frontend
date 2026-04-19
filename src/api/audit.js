import { portalClient } from './client';

export const listAuditLogs = (params = {}) =>
  portalClient.get('/portal/audit-logs', { params });
