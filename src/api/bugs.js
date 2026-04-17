import { portalClient } from './client';

export const listBugs  = (params) => portalClient.get('/portal/delivery/bugs', { params });
export const createBug = (data)   => portalClient.post('/portal/delivery/bugs/create', data);
export const getBug    = (id)     => portalClient.get(`/portal/delivery/bugs/${id}`);
export const updateBug = (id, d)  => portalClient.patch(`/portal/delivery/bugs/${id}`, d);
export const bugStats  = ()       => portalClient.get('/portal/delivery/bugs/stats');
