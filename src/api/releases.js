import { portalClient } from './client';

export const listReleases         = (params) => portalClient.get('/portal/delivery/releases', { params });
export const createRelease        = (data)   => portalClient.post('/portal/delivery/releases/create', data);
export const getRelease           = (id)     => portalClient.get(`/portal/delivery/releases/${id}`);
export const updateRelease        = (id, d)  => portalClient.patch(`/portal/delivery/releases/${id}`, d);

export const listFeatures         = (params) => portalClient.get('/portal/delivery/features', { params });
export const createFeature        = (data)   => portalClient.post('/portal/delivery/features/create', data);
export const getFeature           = (id)     => portalClient.get(`/portal/delivery/features/${id}`);
export const updateFeature        = (id, d)  => portalClient.patch(`/portal/delivery/features/${id}`, d);
export const voteFeature          = (id)     => portalClient.post(`/portal/delivery/features/${id}/vote`);

export const listFeatureRequests  = (params) => portalClient.get('/portal/delivery/feature-requests', { params });
export const createFeatureRequest = (data)   => portalClient.post('/portal/delivery/feature-requests/create', data);
export const updateFeatureRequest = (id, d)  => portalClient.patch(`/portal/delivery/feature-requests/${id}`, d);
