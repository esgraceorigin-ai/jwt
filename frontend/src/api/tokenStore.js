let accessToken = null;
let refreshToken = null;

export function setTokens(tokens) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
}

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
}