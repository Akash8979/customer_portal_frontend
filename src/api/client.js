import axios from 'axios';

const TICKET_API = import.meta.env.VITE_TICKET_API_URL || 'http://localhost:9090';
// Empty in dev → Vite proxy handles routing. Set VITE_AI_ENGINE_URL on Railway.
const AI_API = import.meta.env.VITE_AI_ENGINE_URL || '';

function buildClient(baseURL) {
  const instance = axios.create({ baseURL, withCredentials: true });

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Attach tenant_id as query param for all portal requests
    const tenantId = localStorage.getItem('tenant_id');
    if (tenantId && !config.params?.tenant_id) {
      config.params = { ...config.params, tenant_id: tenantId };
    }
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    async (err) => {
      const original = err.config;
      if (err.response?.status === 401 && !original._retry) {
        original._retry = true;
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
          try {
            const { data } = await axios.post(`${TICKET_API}/portal/user/token/refresh`, { refresh });
            localStorage.setItem('access_token', data.access);
            original.headers.Authorization = `Bearer ${data.access}`;
            return instance(original);
          } catch {
            localStorage.clear();
            window.location.href = '/login';
          }
        }
      }
      return Promise.reject(err);
    },
  );

  return instance;
}

export const portalClient = buildClient(TICKET_API);
export const aiClient     = buildClient(AI_API);
