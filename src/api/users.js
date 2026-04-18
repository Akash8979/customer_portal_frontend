import { portalClient } from './client';

export const getRolePermissions = ()       => portalClient.get('/portal/users/role-permissions');
export const rolePermissionMap  = ()       => portalClient.get('/portal/users/role-permissions');
export const listUsers          = (params) => portalClient.get('/portal/users/', { params });
export const createUser         = (data)   => portalClient.post('/portal/users/create', data);
export const getUser            = (id)     => portalClient.get(`/portal/users/${id}`);
export const updateUser         = (id, d)  => portalClient.patch(`/portal/users/${id}`, d);
export const deactivateUser     = (id)     => portalClient.post(`/portal/users/${id}/deactivate`);
export const activateUser       = (id)     => portalClient.post(`/portal/users/${id}/activate`);
export const listMentionUsers   = ()       => portalClient.get('/portal/users/mentions');
