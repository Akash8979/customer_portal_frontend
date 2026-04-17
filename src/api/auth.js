import { portalClient } from './client';

export const login = (email, password) =>
  portalClient.post('/portal/user/login', { email, password });

export const logout = () =>
  portalClient.post('/portal/user/logout');

export const refreshToken = (refresh) =>
  portalClient.post('/portal/user/token/refresh', { refresh });

export const getMe = () =>
  portalClient.get('/portal/user/auth/session');
