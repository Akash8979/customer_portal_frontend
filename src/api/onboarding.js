import { portalClient } from './client';

export const listOnboarding       = (params) => portalClient.get('/portal/delivery/onboarding', { params });
export const getOnboardingStats   = ()        => portalClient.get('/portal/delivery/onboarding/stats');
export const createOnboarding     = (data)   => portalClient.post('/portal/delivery/onboarding/create', data);
export const getOnboarding        = (id)     => portalClient.get(`/portal/delivery/onboarding/${id}`);
export const updateOnboarding     = (id, d)  => portalClient.patch(`/portal/delivery/onboarding/${id}`, d);
export const createPhase          = (pid, d) => portalClient.post(`/portal/delivery/onboarding/${pid}/phases`, d);
export const updatePhase          = (id, d)  => portalClient.patch(`/portal/delivery/phases/${id}`, d);
export const createTask           = (pid, d) => portalClient.post(`/portal/delivery/phases/${pid}/tasks`, d);
export const updateTask           = (id, d)  => portalClient.patch(`/portal/delivery/tasks/${id}`, d);
