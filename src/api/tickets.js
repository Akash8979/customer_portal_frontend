import { portalClient } from './client';

export const createTicket     = (data)      => portalClient.post('/portal/tickets', data);
export const listTickets      = (params)    => portalClient.get('/portal/tickets/list', { params });
export const getTicket        = (id)        => portalClient.get(`/portal/tickets/${id}`);
export const updateTicket     = (id, data)  => portalClient.patch(`/portal/tickets/${id}/update`, data);
export const updateStatus     = (id, status) => portalClient.patch(`/portal/tickets/${id}/status`, { status });
export const getTicketKpis    = ()          => portalClient.get('/portal/dashboard/kpis');
export const getComments      = (id)        => portalClient.get(`/portal/tickets/${id}/comments`);
export const createComment    = (data)      => portalClient.post('/portal/comments', data);
export const updateComment    = (id, data)  => portalClient.patch(`/portal/comments/${id}/update`, data);
export const uploadAttachment = (data)      => portalClient.post('/portal/attachments', data);
