const localApiBaseUrl = 'http://localhost:3001/v1';
const productionApiBaseUrl = 'https://backendsurmesure.onrender.com/v1';

export function getApiUrl(endpoint: string): string {
  const hostname = typeof window === 'undefined' ? '' : window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const baseUrl = isLocal ? localApiBaseUrl : productionApiBaseUrl;
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}
