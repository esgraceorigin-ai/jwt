import { api } from './apiClient';
import { setTokens, clearTokens } from './tokenStore';

export async function login() {
  const response = await api.post('/auth/login', {
    username: 'test',
    password: '1234',
  });

  setTokens(response.data);

  return response.data;
}

export function logoutLocal() {
  clearTokens();
}

export async function callTestApis() {
  const requests = [];

  for (let i = 1; i <= 8; i += 1) {
    requests.push(api.get(`/test/data${i}`));
  }

  return Promise.allSettled(requests);
}