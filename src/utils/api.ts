// API configuration
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return '';

  // Use environment variable if provided (Vite)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;

  // If we are in a Capacitor environment (mobile app)
  if (window.location.protocol === 'capacitor:') {
    // If you have a specific production server, put it here:
    // return 'https://uzbechka-794ad.onrender.com';
    
    // Fallback: if we don't have VITE_API_URL, try to deduce from current host 
    // but capacitor://localhost won't work for remote server.
    // For now, return empty or a default if known.
    return ''; 
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
