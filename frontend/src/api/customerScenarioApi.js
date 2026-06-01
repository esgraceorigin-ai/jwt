import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from './tokenStore';

const rawClient = axios.create({
  baseURL: '/api',
});

function emitLog(message) {
  window.dispatchEvent(
    new CustomEvent('poc-log', {
      detail: message,
    }),
  );
}

function authHeader(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function rawRefresh(refreshToken) {
  return rawClient.post('/auth/refresh', {
    refreshToken,
  });
}

async function rawProtectedRequest(number, accessToken) {
  return rawClient.get(`/test/data${number}`, {
    headers: authHeader(accessToken),
  });
}

/**
 * 비정상 재현 A:
 * API 8개가 각각 401을 받은 뒤, 각 요청이 개별적으로 Refresh를 수행하는 구조.
 *
 * 목적:
 * Refresh 요청이 실패 요청 수만큼 중복 발생하는 문제를 재현합니다.
 */
export async function reproduceDuplicateRefreshScenario() {
  const expiredAccessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!expiredAccessToken || !refreshToken) {
    throw new Error('Access Token 또는 Refresh Token이 없습니다. 먼저 로그인하십시오.');
  }

  emitLog('[CUSTOMER-A] 비정상 재현 A 시작: 요청별 Refresh 중복 발생');
  emitLog('[CUSTOMER-A] 만료된 Access Token 스냅샷으로 API 8개를 동시에 호출합니다.');

  let refreshCount = 0;

  const requests = Array.from({ length: 8 }, async (_, index) => {
    const number = index + 1;
    const url = `/test/data${number}`;

    try {
      emitLog(`[CUSTOMER-A][REQUEST] GET ${url} expiredAccessToken`);

      const response = await rawProtectedRequest(number, expiredAccessToken);

      emitLog(`[CUSTOMER-A][UNEXPECTED-SUCCESS] ${url} status=${response.status}`);

      return {
        number,
        firstStatus: response.status,
        refreshStatus: null,
        retryStatus: response.status,
        result: 'unexpected-success',
      };
    } catch (error) {
      const firstStatus = error.response?.status;

      emitLog(`[CUSTOMER-A][401] ${url} status=${firstStatus}`);

      if (firstStatus !== 401) {
        emitLog(`[CUSTOMER-A][FAIL] ${url} expected=401 actual=${firstStatus}`);

        return {
          number,
          firstStatus,
          refreshStatus: null,
          retryStatus: null,
          result: 'failed-before-refresh',
        };
      }

      refreshCount += 1;

      emitLog(`[CUSTOMER-A][REFRESH-START] ${url} 요청 단위 Refresh 시작`);

      try {
        const refreshResponse = await rawRefresh(refreshToken);
        const newAccessToken = refreshResponse.data.accessToken;

        emitLog(
          `[CUSTOMER-A][REFRESH-SUCCESS] ${url} refreshStatus=${refreshResponse.status}`,
        );

        if (newAccessToken) {
          setAccessToken(newAccessToken);
        }

        const retryResponse = await rawClient.get(url, {
          headers: authHeader(newAccessToken),
        });

        emitLog(`[CUSTOMER-A][RETRY-SUCCESS] ${url} retryStatus=${retryResponse.status}`);

        return {
          number,
          firstStatus,
          refreshStatus: refreshResponse.status,
          retryStatus: retryResponse.status,
          result: 'retry-success',
        };
      } catch (refreshError) {
        const refreshStatus = refreshError.response?.status;

        emitLog(`[CUSTOMER-A][REFRESH-FAIL] ${url} refreshStatus=${refreshStatus}`);

        return {
          number,
          firstStatus,
          refreshStatus,
          retryStatus: null,
          result: 'refresh-failed',
        };
      }
    }
  });

  const results = await Promise.allSettled(requests);

  const fulfilled = results
    .filter((item) => item.status === 'fulfilled')
    .map((item) => item.value);

  const retrySuccessCount = fulfilled.filter((item) => item.result === 'retry-success').length;
  const failedCount = results.length - retrySuccessCount;

  emitLog(
    `[CUSTOMER-A][END] Refresh 발생 수=${refreshCount}, 재시도 성공=${retrySuccessCount}, 실패=${failedCount}`,
  );

  return {
    scenario: 'CUSTOMER_A_DUPLICATE_REFRESH',
    refreshCount,
    retrySuccessCount,
    failedCount,
    results,
  };
}

/**
 * 비정상 재현 B:
 * API 8개가 401을 받고, Refresh는 1회만 수행하지만,
 * 최초 실패 요청 1개만 재시도하고 나머지는 복구하지 않는 구조.
 *
 * 목적:
 * "Refresh 1회만 했지만 병렬/하위 요청 일부가 실패 상태로 남는 문제"를 재현합니다.
 */
export async function reproduceOnlyOneRetryScenario() {
  const expiredAccessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!expiredAccessToken || !refreshToken) {
    throw new Error('Access Token 또는 Refresh Token이 없습니다. 먼저 로그인하십시오.');
  }

  emitLog('[CUSTOMER-B] 비정상 재현 B 시작: Refresh 1회 / 일부 요청만 복구');
  emitLog('[CUSTOMER-B] 만료된 Access Token 스냅샷으로 API 8개를 동시에 호출합니다.');

  const firstResponses = await Promise.allSettled(
    Array.from({ length: 8 }, async (_, index) => {
      const number = index + 1;
      const url = `/test/data${number}`;

      try {
        emitLog(`[CUSTOMER-B][REQUEST] GET ${url} expiredAccessToken`);

        const response = await rawProtectedRequest(number, expiredAccessToken);

        emitLog(`[CUSTOMER-B][UNEXPECTED-SUCCESS] ${url} status=${response.status}`);

        return {
          number,
          url,
          firstStatus: response.status,
          firstSuccess: true,
        };
      } catch (error) {
        const status = error.response?.status;

        emitLog(`[CUSTOMER-B][401] ${url} status=${status}`);

        return {
          number,
          url,
          firstStatus: status,
          firstSuccess: false,
        };
      }
    }),
  );

  const failedItems = firstResponses
    .filter((item) => item.status === 'fulfilled')
    .map((item) => item.value)
    .filter((item) => item.firstStatus === 401);

  emitLog(`[CUSTOMER-B] 최초 401 발생 수=${failedItems.length}`);

  if (failedItems.length === 0) {
    emitLog('[CUSTOMER-B][END] 401 요청이 없어 재현 실패');

    return {
      scenario: 'CUSTOMER_B_ONLY_ONE_RETRY',
      first401Count: 0,
      refreshCount: 0,
      retrySuccessCount: 0,
      abandonedCount: 0,
      results: firstResponses,
    };
  }

  emitLog('[CUSTOMER-B][REFRESH-START] Refresh 1회만 수행');

  const refreshResponse = await rawRefresh(refreshToken);
  const newAccessToken = refreshResponse.data.accessToken;

  if (newAccessToken) {
    setAccessToken(newAccessToken);
  }

  emitLog(`[CUSTOMER-B][REFRESH-SUCCESS] refreshStatus=${refreshResponse.status}`);

  const firstFailed = failedItems[0];

  emitLog(`[CUSTOMER-B][RETRY-FIRST] 최초 실패 요청 1개만 재시도: ${firstFailed.url}`);

  const retryResponse = await rawClient.get(firstFailed.url, {
    headers: authHeader(newAccessToken),
  });

  emitLog(`[CUSTOMER-B][RETRY-FIRST-SUCCESS] ${firstFailed.url} status=${retryResponse.status}`);

  const abandonedCount = failedItems.length - 1;

  failedItems.slice(1).forEach((item) => {
    emitLog(`[CUSTOMER-B][ABANDONED] 재시도하지 않은 실패 요청: ${item.url}`);
  });

  emitLog(
    `[CUSTOMER-B][END] Refresh 발생 수=1, 재시도 성공=1, 미복구 요청=${abandonedCount}`,
  );

  return {
    scenario: 'CUSTOMER_B_ONLY_ONE_RETRY',
    first401Count: failedItems.length,
    refreshCount: 1,
    retrySuccessCount: 1,
    abandonedCount,
    results: firstResponses,
  };
}