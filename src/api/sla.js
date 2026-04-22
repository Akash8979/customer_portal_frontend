import { portalClient } from './client';

export const listSlaPolicies  = (params) => portalClient.get('/portal/sla-policies', { params });
export const upsertSlaPolicy  = (data)   => portalClient.post('/portal/sla-policies', data);
export const updateSlaPolicy  = (id, d)  => portalClient.patch(`/portal/sla-policies/${id}`, d);
export const deleteSlaPolicy  = (id)     => portalClient.delete(`/portal/sla-policies/${id}`);
