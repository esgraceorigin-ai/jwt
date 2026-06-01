# JWT Refresh Single-Flight PoC

## 1. 목적

본 PoC는 Access Token 만료 시 여러 API 요청이 동시에 인증 실패하는 상황에서, Refresh 요청을 중복으로 발생시키지 않고 실패 요청을 정상 복구하는 흐름을 검증하기 위한 예제입니다.

핵심 검증 목표는 다음과 같습니다.

```text
API 요청 8개 동시 발생
→ Access Token 만료로 8개 요청 인증 실패
→ Refresh 요청은 1회만 수행
→ 나머지 실패 요청은 대기
→ 새 Access Token 발급
→ 기존 실패 요청 재시도
→ 최종적으로 모든 요청 정상 처리
```

본 PoC는 운영 시스템을 대체하기 위한 완성형 인증 모듈이 아니라, JWT 갱신 구조의 정상 동작 기준을 설명하고 검증하기 위한 기술 검증용 예제입니다.

---

## 2. 확인하려는 문제

화면 하나를 열 때 여러 API 요청이 동시에 발생하는 것은 일반적인 웹 구조일 수 있습니다.

예를 들어 다음과 같은 요청들이 동시에 또는 짧은 시간 내에 발생할 수 있습니다.

```text
GET /api/test/data1
GET /api/test/data2
GET /api/test/data3
GET /api/test/data4
GET /api/test/data5
GET /api/test/data6
GET /api/test/data7
GET /api/test/data8
```

문제는 요청 수 자체가 아닙니다.

문제는 Access Token이 만료된 상태에서 여러 API 요청이 동시에 인증 실패했을 때, 각 실패 요청이 개별적으로 Refresh 요청을 수행하는 구조입니다.

잘못된 흐름은 다음과 같습니다.

```text
API 요청 8개 동시 발생
→ Access Token 만료로 8개 요청 실패
→ 각 요청이 개별적으로 Refresh 수행
→ Refresh 요청 8회 발생
→ 인증 서버 부하 증가
→ 일부 요청 실패 또는 화면 지연 발생
```

또 다른 잘못된 흐름은 다음과 같습니다.

```text
API 요청 8개 동시 발생
→ Access Token 만료로 8개 요청 실패
→ Refresh 요청은 1회만 수행
→ 최초 요청 1개만 재시도 성공
→ 나머지 7개 요청은 실패 상태로 종료
```

정상 구조에서는 Refresh 요청을 1회로 제한하는 것만으로는 부족합니다.
Refresh 진행 중 발생한 다른 실패 요청을 대기열에 보관하고, 새 Access Token 발급 후 기존 실패 요청을 재시도해야 합니다.

---

## 3. 정상 동작 기준

정상적인 JWT 갱신 흐름은 다음과 같습니다.

```text
1. API 요청 전송
2. Access Token 만료로 401 Unauthorized 발생
3. 클라이언트가 Refresh 진행 여부 확인
4. Refresh가 진행 중이 아니면 Refresh 요청 1회 수행
5. Refresh가 이미 진행 중이면 실패 요청을 대기열에 등록
6. Refresh Token 검증 후 새 Access Token 발급
7. 대기 중이던 요청들을 새 Access Token으로 재시도
8. 전체 요청 정상 처리
```

핵심은 다음과 같습니다.

```text
Refresh 요청은 1회
실패 요청은 대기
새 Access Token 발급 후 재시도
Refresh 실패 시 전체 세션 정리
```

---

## 4. Access Token과 Refresh Token의 역할

Access Token과 Refresh Token은 역할이 다릅니다.

| 구분            | 역할                   |
| ------------- | -------------------- |
| Access Token  | API 접근 인증에 사용        |
| Refresh Token | Access Token 재발급에 사용 |

Access Token은 API 요청 시 사용되는 접근권입니다.
Refresh Token은 Access Token이 만료되었을 때 새 Access Token을 발급받기 위한 재발급권입니다.

따라서 Access Token이 만료되었을 때, 만료된 Access Token만으로 새 Access Token을 발급하는 구조는 역할 분리가 불명확해질 수 있습니다.

정상적인 구조에서는 Refresh 요청 시 다음 중 하나의 형태로 Refresh Token 또는 세션 식별값이 서버에 전달되어야 합니다.

```text
1. HttpOnly Secure Cookie
2. Authorization Header와 별도 구분된 Refresh Token Header
3. Request Body의 refreshToken
4. 서버 세션 식별용 Cookie
```

중요한 점은 클라이언트가 Refresh 요청 시 서버가 검증할 수 있는 값을 제시해야 한다는 것입니다.

서버는 해당 값을 DB, Redis, Session Store 등과 대조하여 유효성, 만료 여부, 폐기 여부를 확인한 뒤 새 Access Token을 발급해야 합니다.

---

## 5. PoC 구성

본 PoC는 다음과 같이 구성됩니다.

```text
backend  : Spring Boot
frontend : React + Vite + Axios
```

백엔드 API는 다음과 같습니다.

```text
POST /api/auth/login
POST /api/auth/refresh
GET  /api/test/data1
GET  /api/test/data2
GET  /api/test/data3
GET  /api/test/data4
GET  /api/test/data5
GET  /api/test/data6
GET  /api/test/data7
GET  /api/test/data8
```

프론트엔드는 Axios Interceptor를 사용하여 다음을 처리합니다.

```text
1. API 요청 시 Access Token 자동 삽입
2. 401 응답 수신 시 Refresh 요청 수행
3. Refresh 중복 방지
4. 실패 요청 대기열 처리
5. 신규 Access Token 발급 후 실패 요청 재시도
6. Refresh 실패 시 토큰 정리
```

---

## 6. 실행 방법

### 6.1 백엔드 실행

```bash
cd backend
mvn spring-boot:run
```

기본 포트는 다음과 같습니다.

```text
http://localhost:8080
```

### 6.2 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

기본 포트는 다음과 같습니다.

```text
http://localhost:5173
```

---

## 7. 시연 절차

1. 프론트엔드 화면 접속
2. 로그인 버튼 클릭
3. Access Token 발급 확인
4. Access Token 만료시간까지 대기
5. API 8개 동시 호출 버튼 클릭
6. 브라우저 개발자도구 Network 탭 확인
7. Refresh 요청 횟수 확인
8. 기존 실패 요청 재시도 여부 확인

정상 결과는 다음과 같습니다.

```text
GET /api/test/data1~data8
→ 401 Unauthorized

POST /api/auth/refresh
→ 1회 발생

GET /api/test/data1~data8
→ 새 Access Token으로 재시도 성공
```

---

## 8. 정상 결과 기준

정상 결과는 다음 조건을 만족해야 합니다.

```text
1. Access Token 만료 후 보호 API 호출 시 401 발생
2. 동시 요청 8개가 실패해도 Refresh 요청은 1회만 발생
3. 나머지 실패 요청은 대기열에 보관
4. Refresh 성공 후 새 Access Token 저장
5. 기존 실패 요청들이 새 Access Token으로 재시도
6. 최종적으로 API 8개가 모두 성공
```

---

## 9. 비정상 결과 기준

다음과 같은 결과는 구조 점검 대상입니다.

```text
1. API 요청 8개 실패 시 Refresh 요청도 8회 발생
2. Refresh 요청은 1회지만 최초 요청 1개만 성공하고 나머지 요청 실패
3. 만료된 Access Token만으로 새 Access Token이 발급됨
4. Refresh Token 전달 위치와 검증 방식이 불명확함
5. Refresh 실패 후 대기 요청이 정리되지 않음
6. 다음 화면 진입 시 다시 만료처럼 동작함
```

---

## 10. 성능시험 관점

성능시험에서는 실제 사용자 흐름을 기준으로 요청 수, 응답시간, 오류율을 확인해야 합니다.

Access Token 만료 시 실패 요청 수만큼 Refresh 요청이 중복 발생하면 다음 문제가 생길 수 있습니다.

```text
1. 인증 서버 부하 증가
2. DB 또는 Redis 부하 증가
3. 네트워크 왕복 증가
4. 사용자 체감 응답 지연
5. 오류율 증가
6. 성능시험 결과 왜곡
```

따라서 성능시험 전 JWT 갱신 구조가 정상적으로 동작하는지 확인해야 합니다.

---

## 11. 보안 관점

Access Token 만료시간을 짧게 설정하는 것은 일반적으로 토큰 탈취 시 영향을 줄이기 위한 조치입니다.

하지만 만료된 Access Token만으로 새 Access Token을 계속 발급받을 수 있거나, Refresh Token 검증 구조가 명확하지 않다면 짧은 만료시간의 보안 효과가 약화될 수 있습니다.

따라서 다음 항목을 확인해야 합니다.

```text
1. Access Token과 Refresh Token의 역할 분리
2. Refresh Token 저장 위치
3. Refresh Token 전달 방식
4. 서버 측 Refresh Token 검증 방식
5. Refresh Token 폐기 정책
6. 로그아웃 또는 강제 만료 시 처리 방식
7. Refresh Token 재사용 탐지 여부
8. 반복 Refresh 요청 탐지 여부
```

---

## 12. 결론

본 PoC의 핵심은 API 요청이 여러 개 발생하는지 여부가 아닙니다.

핵심은 Access Token 만료 시 여러 요청이 동시에 실패했을 때, Refresh 요청을 1회로 제한하고 실패 요청을 새 Access Token으로 정상 재시도할 수 있는지입니다.

정리하면 다음과 같습니다.

```text
요청이 여러 개 발생하는 것은 정상일 수 있음
Refresh가 요청 수만큼 발생하는 것은 구조 점검 대상
Refresh 1회만 수행하고 실패 요청을 재시도하지 않는 것도 문제
정상 구조는 Refresh 1회 + 실패 요청 대기 + 새 토큰으로 재시도
```
