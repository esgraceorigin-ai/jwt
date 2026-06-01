import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearTokens,
} from './tokenStore';

export const api = axios.create({
  baseURL: '/api',
});

// refresh 전용 client
// 중요: 이 인스턴스에는 response interceptor를 붙이지 않음
const refreshClient = axios.create({
  baseURL: '/api',
});

let isRefreshing = false;
let failedQueue = [];

function log(message) {
  window.dispatchEvent(new CustomEvent('poc-log', { detail: message }));
}

function processQueue(error, newAccessToken = null) {
  failedQueue.forEach(({ resolve, reject, url }) => {
    if (error) {
      log(`[QUEUE-FAIL] ${url}`);
      reject(error);
    } else {
      log(`[QUEUE-RETRY] ${url}`);
      resolve(newAccessToken);
    }
  });

  failedQueue = [];
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  log(`[REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

api.interceptors.response.use(
  (response) => {
    log(`[SUCCESS] ${response.config.url}`);
    return response;
  },

  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    if (status !== 401) {
      log(`[ERROR] ${originalRequest.url} status=${status}`);
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      log(`[RETRY-FAILED] ${originalRequest.url}`);
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    log(`[401] ${originalRequest.url} Access Token 만료 또는 인증 실패`);

    if (isRefreshing) {
      log(`[WAIT] Refresh 진행 중이므로 대기: ${originalRequest.url}`);

      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve,
          reject,
          url: originalRequest.url,
        });
      }).then((newAccessToken) => {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      log(`[REFRESH-START] Refresh 요청 시작`);

      const refreshToken = getRefreshToken();

      const refreshResponse = await refreshClient.post('/auth/refresh', {
        refreshToken,
      });

      const newAccessToken = refreshResponse.data.accessToken;

      setAccessToken(newAccessToken);

      log(`[REFRESH-SUCCESS] 새 Access Token 발급 완료`);

      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      log(`[RETRY-FIRST] 최초 실패 요청 재시도: ${originalRequest.url}`);

      return api(originalRequest);
    } catch (refreshError) {
      log(`[REFRESH-FAIL] Refresh 실패. 세션 정리`);

      processQueue(refreshError, null);
      clearTokens();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);