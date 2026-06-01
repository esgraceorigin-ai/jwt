import { useEffect, useState } from 'react';
import { login, logoutLocal, callTestApis } from './api/authApi';
import './App.css';

function App() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const handler = (event) => {
      setLogs((prev) => [
        `${new Date().toLocaleTimeString()} ${event.detail}`,
        ...prev,
      ]);
    };

    window.addEventListener('poc-log', handler);

    return () => {
      window.removeEventListener('poc-log', handler);
    };
  }, []);

  const addLog = (message) => {
    setLogs((prev) => [
      `${new Date().toLocaleTimeString()} ${message}`,
      ...prev,
    ]);
  };

  const handleLogin = async () => {
    try {
      await login();
      addLog('[LOGIN] 로그인 성공. Access/Refresh Token 저장');
    } catch (error) {
      addLog(`[LOGIN-FAIL] ${error.message}`);
    }
  };

  const handleCallApis = async () => {
    addLog('[TEST] API 8개 동시 호출 시작');

    const results = await callTestApis();

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.filter((r) => r.status === 'rejected').length;

    addLog(`[TEST-END] 성공=${successCount}, 실패=${failCount}`);
  };

  const handleClear = () => {
    setLogs([]);
  };

  const handleLogoutLocal = () => {
    logoutLocal();
    addLog('[LOCAL-LOGOUT] 프론트 토큰 제거');
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>JWT Refresh Single-Flight PoC</h1>

      <p>
        Access Token 만료 후 API 8개를 동시에 호출했을 때 Refresh 요청이
        1번만 발생하고, 실패 요청들이 새 토큰으로 재시도되는지 확인합니다.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={handleLogin}>1. 로그인</button>
        <button onClick={handleCallApis}>2. API 8개 동시 호출</button>
        <button onClick={handleLogoutLocal}>프론트 토큰 제거</button>
        <button onClick={handleClear}>로그 지우기</button>
      </div>

      <div
        style={{
          border: '1px solid #ccc',
          padding: 16,
          height: 500,
          overflow: 'auto',
          background: '#111',
          color: '#eee',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
        }}
      >
        {logs.map((log, index) => (
          <div key={`${log}-${index}`}>{log}</div>
        ))}
      </div>
    </div>
  );
}

export default App;