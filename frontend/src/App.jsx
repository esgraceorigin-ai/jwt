import { useEffect, useMemo, useRef, useState } from 'react';
import {
  login,
  logout,
  logoutLocal,
  callTestApis,
  tryRefreshWithAccessToken,
  tryRefreshWithoutToken,
  tryRefreshWithCurrentRefreshToken,
  tryRefreshWithOldRefreshTokenAfterLogout,
  runCustomerDuplicateRefreshScenario,
  runCustomerOnlyOneRetryScenario,
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
  const logBoxRef = useRef(null);

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

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

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
    await runAction('TC-01 로그인 및 토큰 발급', login);
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
    await runAction('TC-04 Access Token으로 Refresh 시도', tryRefreshWithAccessToken);
  }

  async function handleTryRefreshWithoutToken() {
    await runAction('TC-05 Refresh Token 없이 Refresh 시도', tryRefreshWithoutToken);
  }

  async function handleLogout() {
    await runAction('TC-07 로그아웃', logout);
  }

  async function handleRefreshWithCurrentRefreshToken() {
    await runAction('현재 Refresh Token으로 수동 Refresh 시도', tryRefreshWithCurrentRefreshToken);
  }

  async function handleRefreshWithOldTokenAfterLogout() {
    await runAction(
      'TC-07 로그아웃 전 Refresh Token 재사용 시도',
      tryRefreshWithOldRefreshTokenAfterLogout,
    );
  }
  async function handleCustomerDuplicateRefreshScenario() {
    await runAction(
      'TC-08 고객사 현상 재현 A: 요청별 Refresh 중복 발생',
      runCustomerDuplicateRefreshScenario,
    );
  }

  async function handleCustomerOnlyOneRetryScenario() {
    await runAction(
      'TC-09 고객사 현상 재현 B: Refresh 1회 / 일부 요청만 복구',
      runCustomerOnlyOneRetryScenario,
    );
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
          Access Token 만료 시 요청 전 Refresh를 먼저 수행하고, 예외적으로 401이 발생해도
          Refresh 1회 + 대기열 + 재시도로 복구되는지 검증합니다.
        </p>
      </section>

      <section className="panel">
        <h2>검증 버튼</h2>

      <div className="button-grid">
        <button className="btn btn-primary" onClick={handleLogin}>
          1. 로그인
        </button>

        <button className="btn btn-success" onClick={handleCallApis}>
          2. API 8개 동시 호출 / 선 Refresh 검증
        </button>

        <button className="btn btn-security" onClick={handleTryRefreshWithAccessToken}>
          3. Access Token으로 Refresh 시도
        </button>

        <button className="btn btn-security" onClick={handleTryRefreshWithoutToken}>
          4. Refresh Token 없이 Refresh 시도
        </button>

        <button className="btn btn-warning" onClick={handleBreakRefreshToken}>
          5. Refresh Token 깨뜨리기
        </button>

        <button className="btn btn-warning" onClick={handleLogout}>
          6. 로그아웃
        </button>

        <button className="btn btn-primary" onClick={handleRefreshWithCurrentRefreshToken}>
          7. 현재 Refresh Token으로 수동 Refresh
        </button>

        <button className="btn btn-warning" onClick={handleRefreshWithOldTokenAfterLogout}>
          8. 로그아웃 전 Refresh Token 재사용 시도
        </button>

        <button className="btn btn-muted" onClick={handleLocalLogout}>
          9. 프론트 토큰 제거
        </button>

        <button className="btn btn-muted" onClick={handleClearLogs}>
          10. 로그 지우기
        </button>

        <button className="btn btn-danger" onClick={handleCustomerDuplicateRefreshScenario}>
          11. 현상 재현 A: Refresh 중복
        </button>

        <button className="btn btn-danger" onClick={handleCustomerOnlyOneRetryScenario}>
          12. 현상 재현 B: 일부 요청만 복구
        </button>

        <button className="btn btn-muted" onClick={refreshTokenStatus}>
          토큰 상태 새로고침
        </button>
      </div>
      </section>

      <section className="layout">
        <div className="panel">
          <h2>토큰 상태</h2>
          <pre className="status">{statusText}</pre>

          <div className="notice">
            <strong>권장 테스트 시나리오</strong>

            <h3>TC-01. 로그인 및 토큰 발급</h3>
            <ol>
              <li>[로그인]을 클릭합니다.</li>
              <li>토큰 상태 영역에서 Access Token과 Refresh Token 존재 여부를 확인합니다.</li>
              <li>Network에서 POST /api/auth/login 200 응답을 확인합니다.</li>
            </ol>

            <h3>TC-02. 유효 토큰 상태 API 호출</h3>
            <ol>
              <li>로그인 직후 [API 8개 동시 호출]을 클릭합니다.</li>
              <li>GET /api/test/data1~8이 모두 200인지 확인합니다.</li>
              <li>이때 Refresh 요청은 발생하지 않아야 합니다.</li>
            </ol>

            <h3>TC-03. 만료 후 선 Refresh 확인</h3>
            <ol>
              <li>로그인 후 Access Token 만료시간 이상 대기합니다. 예: 10초</li>
              <li>[API 8개 동시 호출]을 클릭합니다.</li>
              <li>[TOKEN-CHECK], [PRE-REFRESH] 로그가 발생하는지 확인합니다.</li>
              <li>/api/auth/refresh가 1회만 발생하는지 확인합니다.</li>
              <li>/api/test/data1~8이 새 Access Token으로 200 응답되는지 확인합니다.</li>
            </ol>

            <h3>TC-04. Access Token으로 Refresh 차단</h3>
            <ol>
              <li>[Access Token으로 Refresh 시도]를 클릭합니다.</li>
              <li>401 응답이 발생하는지 확인합니다.</li>
              <li>Access Token으로 새 Access Token이 발급되면 비정상입니다.</li>
            </ol>

            <h3>TC-05. Refresh Token 없이 Refresh 차단</h3>
            <ol>
              <li>[Refresh Token 없이 Refresh 시도]를 클릭합니다.</li>
              <li>401 응답이 발생하는지 확인합니다.</li>
              <li>재발급 근거 없이 Access Token이 발급되면 비정상입니다.</li>
            </ol>

            <h3>TC-06. Refresh 실패 시 정리</h3>
            <ol>
              <li>[로그인]을 클릭합니다.</li>
              <li>[Refresh Token 깨뜨리기]를 클릭합니다.</li>
              <li>Access Token 만료시간 이상 대기합니다.</li>
              <li>[API 8개 동시 호출]을 클릭합니다.</li>
              <li>Refresh 실패 후 토큰과 대기 요청이 정리되는지 확인합니다.</li>
            </ol>

            <h3>TC-07. 로그아웃 후 Refresh Token 재사용 차단</h3>
            <ol>
              <li>[로그인]을 클릭합니다.</li>
              <li>[로그아웃]을 클릭합니다.</li>
              <li>[로그아웃 전 Refresh Token 재사용 시도]를 클릭합니다.</li>
              <li>401 응답이 발생하는지 확인합니다.</li>
            </ol>
          </div>
        </div>

        <div className="panel">
          <h2>화면 로그</h2>
          <div className="log-box" ref={logBoxRef}>
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