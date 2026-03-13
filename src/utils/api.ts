const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const { hostname, port } = window.location;
    if (hostname === 'localhost' && (port === '5173' || port === '3000')) {
      return 'http://localhost:3000';
    }
    return ''; // Use relative paths on production
  }
  return '';
};

export const API_BASE_URL = getApiBaseUrl();
console.log('API_BASE_URL initialized as:', API_BASE_URL || '(relative)');

export const apiFetch = (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  console.log(`[apiFetch] Requesting: ${url}`);
  return fetch(url, options).then(response => {
    console.log(`[apiFetch] Response from ${url}: ${response.status} ${response.statusText}`);
    return response;
  }).catch(error => {
    console.error(`[apiFetch] Error fetching ${url}:`, error);
    throw error;
  });
};
