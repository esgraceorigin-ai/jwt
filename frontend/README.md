10. 시연 시나리오
정상 Refresh Single-Flight 확인
1. 로그인
2. 10초 이상 대기
3. API 8개 동시 호출
4. Network 확인

정상 결과:

GET /api/test/data1~8 → 401
POST /api/auth/refresh → 1회
GET /api/test/data1~8 → 200
화면 로그: 성공=8, 실패=0
Access Token 역할 분리 확인
1. 로그인
2. Access Token으로 Refresh 시도

정상 결과:

POST /api/auth/refresh → 401
Token is not refresh token
Refresh Token 없이 재발급 방지 확인
1. Refresh Token 없이 Refresh 시도

정상 결과:

POST /api/auth/refresh → 401
Missing refresh token
Refresh 실패 시 Queue 정리 확인
1. 로그인
2. Refresh Token 깨뜨리기
3. 10초 이상 대기
4. API 8개 동시 호출

정상 결과:

GET /api/test/data1~8 → 401
POST /api/auth/refresh → 401
QUEUE-FAIL 발생
TEST-END 성공=0, 실패=8
로그아웃 후 재발급 방지 확인
1. 로그인
2. 로그아웃
3. 현재 Refresh Token으로 Refresh 시도

단, 위 코드에서는 logout() 성공 시 프론트 토큰을 제거합니다.
“로그아웃 후 기존 Refresh Token 재사용 실패”까지 정확히 보여주려면, 로그아웃 전에 Refresh Token을 따로 보관하는 테스트 함수를 하나 더 만들면 됩니다.

