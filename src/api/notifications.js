import { portalClient } from './client';

export const getNotifications  = ()     => portalClient.get('/portal/notifications');
export const markAllRead       = ()     => portalClient.post('/portal/notifications/mark-all');
export const markOneRead       = (id)   => portalClient.patch(`/portal/notifications/${id}/read`);
