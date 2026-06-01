import { api, rawRefreshWithRefreshToken } from './apiClient';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  corruptRefreshToken,
  getTokenStatus,
} from './tokenStore';
import {
  reproduceDuplicateRefreshScenario,
  reproduceOnlyOneRetryScenario,
} from './customerScenarioApi';

let lastRefreshTokenBeforeLogout = null;

export async function login() {
  const response = await api.post('/auth/login', {
    username: 'test',
    password: '1234',
  });

  setTokens(response.data);

  return response.data;
}

export async function logout() {
  const refreshToken = getRefreshToken();

  lastRefreshTokenBeforeLogout = refreshToken;

  const response = await api.post('/auth/logout', {
    refreshToken,
  });

  clearTokens();

  return response.data;
}

export function logoutLocal() {
  clearTokens();
}

export function breakRefreshToken() {
  corruptRefreshToken();
}

export function tokenStatus() {
  return getTokenStatus();
}

export async function callTestApis() {
  const requests = [];

  for (let i = 1; i <= 8; i += 1) {
    requests.push(api.get(`/test/data${i}`));
  }

  return Promise.allSettled(requests);
}

export async function tryRefreshWithAccessToken() {
  const accessToken = getAccessToken();

  return rawRefreshWithRefreshToken(accessToken);
}

export async function tryRefreshWithoutToken() {
  return rawRefreshWithRefreshToken(null);
}

export async function tryRefreshWithCurrentRefreshToken() {
  const refreshToken = getRefreshToken();

  return rawRefreshWithRefreshToken(refreshToken);
}

export async function tryRefreshWithOldRefreshTokenAfterLogout() {
  return rawRefreshWithRefreshToken(lastRefreshTokenBeforeLogout);
}

export async function runCustomerDuplicateRefreshScenario() {
  return reproduceDuplicateRefreshScenario();
}

export async function runCustomerOnlyOneRetryScenario() {
  return reproduceOnlyOneRetryScenario();
}