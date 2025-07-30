// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://joingroup-8835.onrender.com';

// Socket.IO Configuration
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://joingroup-8835.onrender.com';

// Environment Configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Local development URLs
const LOCAL_API_URL = 'https://joingroup-8835.onrender.com';
const LOCAL_SOCKET_URL = 'https://joingroup-8835.onrender.com';

// Production URLs
const PROD_API_URL = 'https://joingroup-8835.onrender.com';
const PROD_SOCKET_URL = 'https://joingroup-8835.onrender.com';

// Export configuration
export const config = {
  apiUrl: isDevelopment ? LOCAL_API_URL : PROD_API_URL,
  socketUrl: isDevelopment ? LOCAL_SOCKET_URL : PROD_SOCKET_URL,
  isDevelopment,
  isProduction
};

export default config; 