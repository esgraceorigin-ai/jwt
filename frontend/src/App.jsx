import { useEffect, useMemo, useState } from 'react';
import {
  login,
  logout,
  logoutLocal,
  callTestApis,
  tryRefreshWithAccessToken,
  tryRefreshWithoutToken,
  tryRefreshWithCurrentRefreshToken,
  breakRefreshToken,
  tokenStatus,
} from './api/authApi';
import './App.css';

function now() {
  return new Date().toLocaleTimeString();
}

function App() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState(tokenStatus());

  const statusText = useMemo(() => {
    return JSON.stringify(status, null, 2);
  }, [status]);

  useEffect(() => {
    const handler = (event) => {
      addLog(event.detail);
      refreshTokenStatus();
    };

    window.addEventListener('poc-log', handler);

    return () => {
      window.removeEventListener('poc-log', handler);
    };
  }, []);

  function addLog(message) {
    setLogs((prev) => [...prev, `${now()} ${message}`]);
  }

  function refreshTokenStatus() {
    setStatus(tokenStatus());
  }

  async function runAction(title, action) {
    addLog(`[ACTION] ${title}`);

    try {
      const result = await action();

      refreshTokenStatus();

      addLog(`[ACTION-SUCCESS] ${title}`);

      return result;
    } catch (error) {
      refreshTokenStatus();

      const statusCode = error.response?.status;
      const responseText =
        typeof error.response?.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response?.data ?? {});

      addLog(
        `[ACTION-FAIL] ${title} status=${statusCode ?? 'N/A'} message=${error.message} response=${responseText}`,
      );

      return null;
    }
  }

  async function handleLogin() {
    await runAction('로그인', login);
  }

  async function handleCallApis() {
    addLog('[TEST] API 8개 동시 호출 시작');

    const results = await callTestApis();

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.filter((r) => r.status === 'rejected').length;

    addLog(`[TEST-END] 성공=${successCount}, 실패=${failCount}`);
    refreshTokenStatus();
  }

  async function handleTryRefreshWithAccessToken() {
    await runAction('Access Token으로 Refresh 시도', tryRefreshWithAccessToken);
  }

  async function handleTryRefreshWithoutToken() {
    await runAction('Refresh Token 없이 Refresh 시도', tryRefreshWithoutToken);
  }

  async function handleLogout() {
    await runAction('로그아웃', logout);
  }

  async function handleRefreshAfterLogout() {
    await runAction('현재 Refresh Token으로 Refresh 시도', tryRefreshWithCurrentRefreshToken);
  }

  function handleBreakRefreshToken() {
    breakRefreshToken();
    refreshTokenStatus();
    addLog('[TOKEN] Refresh Token을 잘못된 값으로 변경');
  }

  function handleLocalLogout() {
    logoutLocal();
    refreshTokenStatus();
    addLog('[LOCAL-LOGOUT] 프론트 토큰 제거');
  }

  function handleClearLogs() {
    setLogs([]);
  }

  return (
    <main className="page">
      <section className="hero">
        <h1>JWT Refresh Single-Flight PoC</h1>
        <p>
          Access Token 만료 후 API 8개가 동시에 실패했을 때 Refresh 요청을 1회로 제한하고,
          실패 요청을 새 Access Token으로 재시도하는지 검증합니다.
        </p>
      </section>

      <section className="panel">
        <h2>검증 버튼</h2>

        <div className="button-grid">
          <button onClick={handleLogin}>1. 로그인</button>
          <button onClick={handleCallApis}>2. API 8개 동시 호출</button>
          <button onClick={handleTryRefreshWithAccessToken}>
            3. Access Token으로 Refresh 시도
          </button>
          <button onClick={handleTryRefreshWithoutToken}>
            4. Refresh Token 없이 Refresh 시도
          </button>
          <button onClick={handleBreakRefreshToken}>
            5. Refresh Token 깨뜨리기
          </button>
          <button onClick={handleLogout}>6. 로그아웃</button>
          <button onClick={handleRefreshAfterLogout}>
            7. 현재 Refresh Token으로 Refresh 시도
          </button>
          <button onClick={handleLocalLogout}>8. 프론트 토큰 제거</button>
          <button onClick={handleClearLogs}>9. 로그 지우기</button>
          <button onClick={refreshTokenStatus}>토큰 상태 새로고침</button>
        </div>
      </section>

      <section className="layout">
        <div className="panel">
          <h2>토큰 상태</h2>
          <pre className="status">{statusText}</pre>

          <div className="notice">
            <strong>시연 순서</strong>
            <ol>
              <li>로그인합니다.</li>
              <li>Access Token 만료시간 이상 대기합니다. 예: 10초</li>
              <li>API 8개 동시 호출을 누릅니다.</li>
              <li>Network 탭에서 /api/auth/refresh가 1회만 발생하는지 확인합니다.</li>
              <li>기존 실패 요청들이 새 Access Token으로 재시도되는지 확인합니다.</li>
            </ol>
          </div>
        </div>

        <div className="panel">
          <h2>화면 로그</h2>
          <div className="log-box">
            {logs.length === 0 ? (
              <div className="empty">아직 로그가 없습니다.</div>
            ) : (
              logs.map((log, index) => <div key={`${log}-${index}`}>{log}</div>)
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;