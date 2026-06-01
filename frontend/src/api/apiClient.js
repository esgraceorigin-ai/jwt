import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearTokens,
  getAccessTokenExpiryInfo,
  isAccessTokenExpiredOrNearExpiry,
} from './tokenStore';

export const api = axios.create({
  baseURL: '/api',
});

const refreshClient = axios.create({
  baseURL: '/api',
});

let refreshPromise = null;
let failedQueue = [];

function emitLog(message) {
  window.dispatchEvent(
    new CustomEvent('poc-log', {
      detail: message,
    }),
  );
}

function isAuthApi(config) {
  const url = config.url ?? '';

  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
}

async function requestRefresh(reason) {
  if (refreshPromise) {
    emitLog(`[REFRESH-WAIT] 이미 Refresh 진행 중. reason=${reason}`);
    return refreshPromise;
  }

  emitLog(`[REFRESH-START] Refresh 요청 시작. reason=${reason}`);

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();

    const response = await refreshClient.post('/auth/refresh', {
      refreshToken,
    });

    const newAccessToken = response.data.accessToken;

    if (!newAccessToken) {
      throw new Error('Refresh 응답에 accessToken이 없습니다.');
    }

    setAccessToken(newAccessToken);
    emitLog('[REFRESH-SUCCESS] 새 Access Token 발급 완료');

    return newAccessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function processQueue(error, newAccessToken = null) {
  failedQueue.forEach(({ resolve, reject, url }) => {
    if (error) {
      emitLog(`[QUEUE-FAIL] ${url}`);
      reject(error);
      return;
    }

    emitLog(`[QUEUE-RETRY] ${url}`);
    resolve(newAccessToken);
  });

  failedQueue = [];
}

api.interceptors.request.use(
  async (config) => {
    const token = getAccessToken();

    if (!token || isAuthApi(config)) {
      emitLog(`[REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    }

    const expiryInfo = getAccessTokenExpiryInfo(2);

    emitLog(
      `[TOKEN-CHECK] ${config.url} remain=${expiryInfo.remainSeconds} expiredOrNear=${expiryInfo.expiredOrNearExpiry}`,
    );

    if (isAccessTokenExpiredOrNearExpiry(2)) {
      emitLog(`[PRE-REFRESH] 요청 전 Access Token 만료 감지: ${config.url}`);

      try {
        const newAccessToken = await requestRefresh('before-request');

        config.headers.Authorization = `Bearer ${newAccessToken}`;

        emitLog(`[PRE-REQUEST] 새 Access Token으로 요청 진행: ${config.url}`);
      } catch (error) {
        emitLog(`[PRE-REFRESH-FAIL] 요청 전 Refresh 실패: ${config.url}`);
        clearTokens();
        return Promise.reject(error);
      }
    } else {
      config.headers.Authorization = `Bearer ${token}`;
    }

    emitLog(`[REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },

  (error) => {
    emitLog(`[REQUEST-ERROR] ${error.message}`);
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    emitLog(`[SUCCESS] ${response.config.url}`);
    return response;
  },

  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      emitLog('[ERROR] 원본 요청 정보 없음');
      return Promise.reject(error);
    }

    const status = error.response?.status;

    if (status !== 401) {
      emitLog(`[ERROR] ${originalRequest.url} status=${status}`);
      return Promise.reject(error);
    }

    if (isAuthApi(originalRequest)) {
      emitLog(`[AUTH-ERROR] 인증 API 실패: ${originalRequest.url}`);
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      emitLog(`[RETRY-FAILED] 이미 재시도한 요청 실패: ${originalRequest.url}`);
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    emitLog(`[401] ${originalRequest.url} Access Token 만료 또는 인증 실패`);

    if (refreshPromise) {
      emitLog(`[WAIT] Refresh 진행 중. 대기열 등록: ${originalRequest.url}`);

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

    try {
      const newAccessToken = await requestRefresh('after-401');

      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      emitLog(`[RETRY-FIRST] 최초 실패 요청 재시도: ${originalRequest.url}`);

      return api(originalRequest);
    } catch (refreshError) {
      emitLog(
        `[REFRESH-FAIL] ${refreshError.response?.status ?? ''} ${refreshError.message}`,
      );
      emitLog('[SESSION-CLEAR] 토큰 정리 및 대기열 실패 처리');

      processQueue(refreshError, null);
      clearTokens();

      return Promise.reject(refreshError);
    }
  },
);

export async function rawRefreshWithRefreshToken(refreshToken) {
  return refreshClient.post('/auth/refresh', {
    refreshToken,
  });
}