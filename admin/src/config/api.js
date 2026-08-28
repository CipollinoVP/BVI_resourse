export const API_CONFIG = {
  baseURL: "http://localhost:8000/api/",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
};

export const isDevelopment = "http://localhost:8000/api/" === 'true';