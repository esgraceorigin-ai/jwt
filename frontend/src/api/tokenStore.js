let accessToken = null;
let refreshToken = null;

export function setTokens(tokens) {
  accessToken = tokens.accessToken ?? null;
  refreshToken = tokens.refreshToken ?? null;
}

export function setAccessToken(token) {
  accessToken = token ?? null;
}

export function setRefreshToken(token) {
  refreshToken = token ?? null;
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

export function corruptRefreshToken() {
  refreshToken = 'invalid-refresh-token-for-poc';
}

function base64UrlDecode(base64Url) {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

  return atob(padded);
}

export function parseJwtPayload(token) {
  if (!token) {
    return null;
  }

  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const json = base64UrlDecode(parts[1]);
    return JSON.parse(json);
  } catch (error) {
    console.warn('[TOKEN] JWT payload parse failed', error);
    return null;
  }
}

export function getAccessTokenPayload() {
  return parseJwtPayload(accessToken);
}

export function getAccessTokenExpiryInfo(bufferSeconds = 2) {
  const payload = getAccessTokenPayload();

  if (!payload?.exp) {
    return {
      hasExp: false,
      exp: null,
      now: Math.floor(Date.now() / 1000),
      remainSeconds: null,
      expiredOrNearExpiry: false,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const remainSeconds = payload.exp - now;

  return {
    hasExp: true,
    exp: payload.exp,
    now,
    remainSeconds,
    expiredOrNearExpiry: payload.exp <= now + bufferSeconds,
  };
}

export function isAccessTokenExpiredOrNearExpiry(bufferSeconds = 2) {
  return getAccessTokenExpiryInfo(bufferSeconds).expiredOrNearExpiry;
}

export function getTokenStatus() {
  const payload = getAccessTokenPayload();
  const expiryInfo = getAccessTokenExpiryInfo(2);

  return {
    hasAccessToken: Boolean(accessToken),
    hasRefreshToken: Boolean(refreshToken),
    accessTokenPreview: accessToken ? `${accessToken.slice(0, 24)}...` : null,
    refreshTokenPreview: refreshToken ? `${refreshToken.slice(0, 24)}...` : null,
    accessTokenType: payload?.type ?? null,
    accessTokenExp: expiryInfo.exp,
    accessTokenRemainSeconds: expiryInfo.remainSeconds,
    accessTokenExpiresAt: expiryInfo.exp
      ? new Date(expiryInfo.exp * 1000).toLocaleTimeString()
      : null,
    accessTokenExpiredOrNearExpiry: expiryInfo.expiredOrNearExpiry,
  };
}