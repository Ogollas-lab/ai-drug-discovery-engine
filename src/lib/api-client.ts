const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const apiClient = {
  get: async (endpoint: string, options: RequestInit = {}) => {
    return fetchWithAuth(endpoint, { ...options, method: 'GET' });
  },
  post: async (endpoint: string, body: any, options: RequestInit = {}) => {
    return fetchWithAuth(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  put: async (endpoint: string, body: any, options: RequestInit = {}) => {
    return fetchWithAuth(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
  delete: async (endpoint: string, options: RequestInit = {}) => {
    return fetchWithAuth(endpoint, { ...options, method: 'DELETE' });
  }
};

async function fetchWithAuth(endpoint: string, options: RequestInit) {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'API Request failed');
  }

  return { data };
}
