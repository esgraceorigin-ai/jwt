# JWT Refresh PoC 구현 메모

## 1. 문서 목적

본 문서는 JWT Refresh Single-Flight PoC의 백엔드 및 프론트엔드 구현 구조를 설명하기 위한 문서입니다.

본 문서의 목적은 다음과 같습니다.

```text
1. PoC 코드 구조 설명
2. Access Token과 Refresh Token 처리 방식 설명
3. 백엔드 Refresh 검증 로직 설명
4. 프론트엔드 Refresh 중복 방지 로직 설명
5. 구현 시 주의사항 정리
6. 운영 시스템 적용 시 추가 검토사항 정리
```

본 PoC는 운영 시스템에 바로 적용하기 위한 완성형 인증 모듈이 아니라, Access Token 만료 시 Refresh 요청을 단일화하고 실패 요청을 재시도하는 구조를 설명하기 위한 검증용 예제입니다.

---

## 2. 전체 구성

PoC는 다음 두 영역으로 구성합니다.

```text
backend  : Spring Boot
frontend : React + Vite + Axios
```

구성 목적은 다음과 같습니다.

| 영역              | 목적                                     |
| --------------- | -------------------------------------- |
| Backend         | Access Token, Refresh Token 발급 및 검증    |
| Frontend        | API 요청, 401 감지, Refresh 단일화, 실패 요청 재시도 |
| Browser Network | Refresh 요청 횟수 및 재시도 흐름 확인              |
| Console/UI Log  | 비전문가도 이해 가능한 흐름 시각화                    |

---

## 3. 백엔드 구현 구조

백엔드 패키지 구조 예시는 다음과 같습니다.

```text
src/main/java/com/example/demo/
├─ DemoApplication.java
├─ auth/
│  ├─ AuthController.java
│  ├─ AuthService.java
│  ├─ JwtProvider.java
│  ├─ RefreshTokenStore.java
│  ├─ LoginRequest.java
│  ├─ RefreshRequest.java
│  └─ TokenResponse.java
├─ security/
│  ├─ SecurityConfig.java
│  └─ JwtAuthenticationFilter.java
└─ test/
   └─ TestController.java
```

---

## 4. 백엔드 API 목록

PoC에서 제공하는 API는 다음과 같습니다.

```text
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout

GET /api/test/data1
GET /api/test/data2
GET /api/test/data3
GET /api/test/data4
GET /api/test/data5
GET /api/test/data6
GET /api/test/data7
GET /api/test/data8
```

각 API의 역할은 다음과 같습니다.

| API                    | 역할                                   | 인증 필요 여부         |
| ---------------------- | ------------------------------------ | ---------------- |
| POST /api/auth/login   | Access Token, Refresh Token 발급       | 불필요              |
| POST /api/auth/refresh | Refresh Token 검증 후 새 Access Token 발급 | 불필요              |
| POST /api/auth/logout  | Refresh Token 폐기                     | PoC에서는 불필요 또는 선택 |
| GET /api/test/data1~8  | 보호 API 테스트                           | 필요               |

---

## 5. Access Token 정책

PoC에서 Access Token은 다음 역할을 가집니다.

```text
1. 보호 API 접근 인증에 사용
2. Authorization Header에 Bearer Token으로 전달
3. 짧은 만료시간을 가짐
4. token type은 access로 구분
```

예시:

```http
GET /api/test/data1
Authorization: Bearer <access_token>
```

PoC 권장 만료시간:

```text
Access Token: 10초
```

만료시간을 짧게 두는 이유는 테스트 시 만료 상황을 빠르게 재현하기 위함입니다.

운영 환경에서는 서비스 정책에 따라 별도 산정해야 합니다.

---

## 6. Refresh Token 정책

PoC에서 Refresh Token은 다음 역할을 가집니다.

```text
1. 새 Access Token 발급에 사용
2. Access Token보다 긴 만료시간을 가짐
3. token type은 refresh로 구분
4. 서버 측 저장소와 대조하여 검증
```

PoC 권장 만료시간:

```text
Refresh Token: 30분
```

운영 환경에서는 보통 더 정교한 정책이 필요합니다.

```text
1. Redis 또는 DB 저장
2. 원문 저장 대신 해시 저장
3. Refresh Token Rotation
4. 재사용 탐지
5. 로그아웃 시 폐기
6. 강제 로그아웃 시 폐기
7. 세션 목록 관리
```

---

## 7. JwtProvider 구현 의도

`JwtProvider`는 JWT 생성 및 검증을 담당합니다.

주요 책임은 다음과 같습니다.

```text
1. Access Token 생성
2. Refresh Token 생성
3. JWT 서명 검증
4. JWT 만료시간 검증
5. subject 추출
6. token type 추출
7. access token 여부 확인
8. refresh token 여부 확인
```

토큰 타입은 claim으로 구분합니다.

```text
Access Token:
type = access

Refresh Token:
type = refresh
```

이 구분이 중요한 이유는 다음과 같습니다.

```text
1. 보호 API에는 Access Token만 허용해야 함
2. Refresh API에는 Refresh Token만 허용해야 함
3. Access Token을 Refresh API에 넣었을 때 거부해야 함
4. Refresh Token을 일반 API 접근용으로 사용할 수 없어야 함
```

즉, Access Token과 Refresh Token은 모두 JWT 형식일 수 있지만, 서버는 두 토큰의 용도를 명확히 구분해야 합니다.

---

## 8. RefreshTokenStore 구현 의도

PoC에서는 `RefreshTokenStore`를 메모리 Map으로 구현할 수 있습니다.

예시 구조:

```text
userId -> refreshToken
```

역할은 다음과 같습니다.

```text
1. 로그인 시 Refresh Token 저장
2. Refresh 요청 시 서버에 저장된 값과 대조
3. 로그아웃 시 Refresh Token 제거
4. 서버가 임의 토큰을 무조건 신뢰하지 않도록 함
```

PoC에서는 단순성을 위해 메모리 Map을 사용합니다.

단, 운영 환경에서는 다음 문제가 있으므로 그대로 사용하면 안 됩니다.

```text
1. 서버 재시작 시 토큰 정보 소실
2. 다중 서버 환경에서 공유 불가
3. 토큰 검색/폐기/감사 로그에 부적합
4. 보안상 원문 저장 위험
```

운영 환경 권장 저장소:

```text
Redis
DB
Session Store
```

운영 환경 권장 저장 방식:

```text
refreshToken 원문 저장 지양
refreshToken hash 저장 권장
jti 기반 식별 권장
expiresAt, revokedAt, lastUsedAt 관리 권장
```

---

## 9. AuthService 구현 의도

`AuthService`는 로그인, Refresh, 로그아웃의 핵심 로직을 담당합니다.

### 9.1 로그인

로그인 처리 흐름은 다음과 같습니다.

```text
1. username/password 검증
2. Access Token 생성
3. Refresh Token 생성
4. Refresh Token 서버 저장소에 저장
5. TokenResponse 반환
```

PoC에서는 사용자 계정을 고정값으로 둘 수 있습니다.

```text
username: test
password: 1234
```

운영 환경에서는 DB, LDAP, SSO, IAM 등 실제 인증 체계와 연동해야 합니다.

---

### 9.2 Refresh

Refresh 처리 흐름은 다음과 같습니다.

```text
1. Refresh 요청 수신
2. refreshToken 존재 여부 확인
3. JWT 서명 검증
4. JWT 만료시간 검증
5. token type이 refresh인지 확인
6. subject에서 userId 추출
7. 서버 저장소의 Refresh Token과 대조
8. 유효하면 새 Access Token 발급
9. TokenResponse 반환
```

중요한 기준은 다음입니다.

```text
Access Token으로 Refresh 불가
Refresh Token으로만 새 Access Token 발급
서버 저장소에 없는 Refresh Token 거부
폐기된 Refresh Token 거부
```

이 기준을 통해 Access Token과 Refresh Token의 역할 분리를 검증합니다.

---

### 9.3 로그아웃

로그아웃 처리 흐름은 다음과 같습니다.

```text
1. Refresh Token 수신
2. Refresh Token 검증
3. subject 추출
4. 서버 저장소에서 Refresh Token 제거
5. 이후 동일 Refresh Token으로 재발급 불가
```

PoC에서는 간단히 구현할 수 있지만, 운영 환경에서는 다음도 함께 검토해야 합니다.

```text
1. Access Token 블랙리스트
2. Refresh Token 폐기
3. 전체 세션 로그아웃
4. 특정 디바이스 로그아웃
5. 강제 로그아웃
6. 감사 로그 적재
```

---

## 10. JwtAuthenticationFilter 구현 의도

`JwtAuthenticationFilter`는 보호 API 요청에서 Access Token을 검증합니다.

처리 흐름은 다음과 같습니다.

```text
1. Authorization Header 확인
2. Bearer Token 추출
3. JWT 서명 검증
4. JWT 만료시간 검증
5. token type이 access인지 확인
6. subject에서 사용자 식별자 추출
7. SecurityContext에 인증 정보 등록
8. 이후 Controller 접근 허용
```

Access Token이 없거나 만료되었거나 잘못된 경우 SecurityContext에 인증 정보가 등록되지 않습니다.

그 결과 보호 API는 Spring Security에 의해 401 Unauthorized로 응답됩니다.

중요한 점은 다음입니다.

```text
Refresh Token은 보호 API 접근용으로 사용하면 안 됨
Access Token만 보호 API 접근에 사용해야 함
만료된 Access Token은 인증 성공 처리하면 안 됨
```

---

## 11. SecurityConfig 구현 의도

`SecurityConfig`는 Spring Security 설정을 담당합니다.

주요 설정은 다음과 같습니다.

```text
1. CSRF 비활성화
2. CORS 설정
3. 세션 Stateless 설정
4. 인증 예외 URL 지정
5. 보호 API 인증 요구
6. JWT 인증 필터 등록
```

PoC 기준 인증 예외 URL:

```text
/api/auth/login
/api/auth/refresh
/api/auth/logout
OPTIONS /**
```

보호 대상:

```text
/api/test/data1~8
그 외 인증이 필요한 API
```

세션 정책은 다음과 같이 둡니다.

```text
SessionCreationPolicy.STATELESS
```

이는 서버의 HTTP Session을 사용하지 않고 JWT 기반으로 인증을 처리하기 위한 설정입니다.

단, Refresh Token 저장소는 별도로 존재할 수 있습니다.
Stateless API 인증과 Refresh Token 서버 저장소 사용은 서로 충돌하지 않습니다.

---

## 12. CORS 설정 의도

프론트엔드와 백엔드가 다른 포트에서 실행되는 경우 CORS 설정이 필요할 수 있습니다.

예시:

```text
Frontend: http://localhost:5173
Backend : http://localhost:8080
```

허용 기준:

```text
Allowed Origin : http://localhost:5173
Allowed Methods: GET, POST, PUT, DELETE, OPTIONS
Allowed Headers: Authorization, Content-Type
Credentials    : true
```

Vite Proxy를 사용하는 경우 브라우저 기준 Origin 문제가 줄어들 수 있지만, 직접 호출 테스트와 실제 환경 차이를 고려해 CORS 정책은 명확히 설정하는 것이 좋습니다.

---

## 13. TestController 구현 의도

`TestController`는 보호 API 8개를 제공하여 동시 인증 실패 상황을 재현하기 위한 컨트롤러입니다.

예시 API:

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

각 API는 인증된 사용자만 접근할 수 있어야 합니다.

Access Token이 유효하면 200 OK를 반환합니다.

Access Token이 없거나 만료되면 401 Unauthorized를 반환해야 합니다.

PoC에서는 Network 탭에서 요청 흐름을 보기 쉽게 하기 위해 각 API에 짧은 지연을 넣을 수 있습니다.

```text
Thread.sleep(150)
```

운영 코드에는 불필요한 지연을 넣으면 안 됩니다.

---

## 14. 프론트엔드 구현 구조

프론트엔드 구조 예시는 다음과 같습니다.

```text
src/
├─ api/
│  ├─ apiClient.js
│  ├─ authApi.js
│  └─ tokenStore.js
├─ App.jsx
└─ main.jsx
```

각 파일의 역할은 다음과 같습니다.

| 파일            | 역할                                      |
| ------------- | --------------------------------------- |
| tokenStore.js | Access Token, Refresh Token 저장/조회/삭제    |
| apiClient.js  | Axios 인스턴스, Interceptor, Refresh 단일화 처리 |
| authApi.js    | 로그인, 로그아웃, 테스트 API 호출 함수                |
| App.jsx       | PoC 화면, 버튼, 로그 출력                       |

---

## 15. tokenStore 구현 의도

`tokenStore.js`는 프론트엔드에서 토큰을 보관하는 역할을 합니다.

PoC에서는 단순성을 위해 메모리 변수에 저장합니다.

```text
accessToken
refreshToken
```

역할은 다음과 같습니다.

```text
1. 로그인 성공 시 토큰 저장
2. API 요청 시 Access Token 조회
3. Refresh 요청 시 Refresh Token 조회
4. Refresh 성공 시 새 Access Token 저장
5. 로그아웃 또는 Refresh 실패 시 토큰 삭제
```

PoC에서 메모리 저장을 사용하는 이유는 다음과 같습니다.

```text
1. 구현 단순
2. XSS 위험 설명에 유리
3. LocalStorage 저장 논쟁 회피
4. 새로고침 시 토큰 초기화되어 테스트 흐름 명확
```

운영 환경에서는 Refresh Token을 JavaScript가 접근 가능한 저장소에 보관하는 것을 신중히 검토해야 합니다.

권장 후보:

```text
HttpOnly Secure Cookie
서버 세션 기반 Cookie
모바일 보안 저장소
```

---

## 16. apiClient 구현 의도

`apiClient.js`는 PoC의 핵심입니다.

담당 기능은 다음과 같습니다.

```text
1. API 요청 시 Access Token 자동 삽입
2. 401 Unauthorized 응답 감지
3. Refresh 요청 수행
4. Refresh 요청 중복 방지
5. 실패 요청 대기열 관리
6. Refresh 성공 후 실패 요청 재시도
7. Refresh 실패 시 대기열 정리
8. 로그 출력
```

핵심 상태값은 다음과 같습니다.

```text
isRefreshing
failedQueue
```

---

## 17. isRefreshing 구현 의도

`isRefreshing`은 현재 Refresh 요청이 진행 중인지 표시합니다.

```text
isRefreshing = false
```

처리 기준:

```text
1. Refresh 진행 중이 아니면 최초 실패 요청이 Refresh 시작
2. Refresh 진행 중이면 후속 실패 요청은 Refresh를 새로 시작하지 않음
3. 후속 실패 요청은 failedQueue에 등록
4. Refresh 완료 후 대기 요청이 재시도됨
```

이 구조를 통해 다음 문제를 방지합니다.

```text
API 요청 8개 실패
→ Refresh 요청 8회 발생
```

정상 구조는 다음입니다.

```text
API 요청 8개 실패
→ Refresh 요청 1회 발생
→ 나머지 요청 대기
```

---

## 18. failedQueue 구현 의도

`failedQueue`는 Refresh 진행 중 발생한 실패 요청을 보관합니다.

역할은 다음과 같습니다.

```text
1. Refresh 중 추가 401 요청 발생 시 대기 등록
2. Refresh 성공 시 새 Access Token 전달
3. 대기 중이던 요청 재시도
4. Refresh 실패 시 대기 요청 전체 실패 처리
```

정상 흐름:

```text
data1 요청 401
→ Refresh 시작

data2 요청 401
→ Refresh 진행 중이므로 failedQueue 등록

data3 요청 401
→ Refresh 진행 중이므로 failedQueue 등록

Refresh 성공
→ failedQueue 요청들에 새 Access Token 전달
→ data2, data3 재시도
```

---

## 19. processQueue 구현 의도

`processQueue`는 대기 중인 요청들을 일괄 처리합니다.

Refresh 성공 시:

```text
1. 대기 요청에 새 Access Token 전달
2. 각 요청이 새 Access Token으로 재시도됨
3. failedQueue 초기화
```

Refresh 실패 시:

```text
1. 대기 요청 전체 실패 처리
2. failedQueue 초기화
3. 토큰 정리
4. 로그인 화면 이동 또는 세션 만료 처리
```

중요한 점은 Refresh 실패 시 대기 요청을 방치하면 안 된다는 것입니다.

방치 시 다음 문제가 발생할 수 있습니다.

```text
1. Promise pending 상태 유지
2. 화면 무한 로딩
3. 사용자 조작 불가
4. 메모리 누수
```

---

## 20. _retry 플래그 구현 의도

`_retry` 플래그는 동일 요청의 무한 재시도를 방지하기 위한 값입니다.

필요한 이유:

```text
1. Access Token이 갱신되었지만 서버가 계속 401을 반환할 수 있음
2. Refresh 성공 후 재시도한 요청이 다시 401을 받을 수 있음
3. 이때 다시 Refresh를 시도하면 무한 루프가 발생할 수 있음
```

처리 기준:

```text
1. 최초 401 요청에 _retry=true 설정
2. 재시도 후 다시 401이면 더 이상 Refresh하지 않음
3. 오류로 종료
```

---

## 21. refreshClient 분리 이유

Refresh 요청은 일반 API 요청용 Axios 인스턴스와 분리하는 것이 좋습니다.

일반 API 인스턴스:

```text
api
```

Refresh 전용 인스턴스:

```text
refreshClient
```

분리 이유:

```text
1. Refresh 요청이 response interceptor를 다시 타는 것을 방지
2. Refresh 실패 시 무한 Refresh 루프 방지
3. 인증 갱신 로직과 일반 API 로직 분리
4. 디버깅 용이
```

Refresh API 자체가 401을 반환했는데 다시 Refresh를 시도하면 무한 루프가 발생할 수 있습니다.

따라서 Refresh API는 자동 Refresh 대상에서 제외하는 것이 안전합니다.

---

## 22. authApi 구현 의도

`authApi.js`는 화면에서 사용할 API 함수를 제공합니다.

주요 함수:

```text
login()
logoutLocal()
callTestApis()
```

`callTestApis()`는 API 8개를 동시에 호출합니다.

예시:

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

이 함수는 Access Token 만료 상태에서 동시 인증 실패 상황을 재현하는 데 사용합니다.

---

## 23. App.jsx 구현 의도

`App.jsx`는 PoC 시연용 화면입니다.

기능은 다음과 같습니다.

```text
1. 로그인 버튼
2. API 8개 동시 호출 버튼
3. 프론트 토큰 제거 버튼
4. 로그 지우기 버튼
5. 화면 로그 출력 영역
```

화면 로그를 두는 이유는 다음과 같습니다.

```text
1. Network 탭을 모르는 비전문가도 흐름 이해 가능
2. Refresh 요청 1회 발생 여부를 직관적으로 확인 가능
3. 실패 요청 대기 및 재시도 흐름 설명 가능
4. 고객사 설명 자료로 활용 가능
```

예상 로그:

```text
[TEST] API 8개 동시 호출 시작
[REQUEST] GET /test/data1
[REQUEST] GET /test/data2
[401] /test/data1 Access Token 만료 또는 인증 실패
[REFRESH-START] Refresh 요청 시작
[WAIT] Refresh 진행 중이므로 대기: /test/data2
[REFRESH-SUCCESS] 새 Access Token 발급 완료
[RETRY-FIRST] 최초 실패 요청 재시도: /test/data1
[QUEUE-RETRY] /test/data2
[TEST-END] 성공=8, 실패=0
```

---

## 24. 정상 동작 흐름

PoC의 정상 동작 흐름은 다음과 같습니다.

```text
1. 사용자가 로그인한다.
2. 서버가 Access Token과 Refresh Token을 발급한다.
3. 프론트엔드가 토큰을 저장한다.
4. Access Token 만료시간까지 대기한다.
5. API 8개 동시 호출 버튼을 클릭한다.
6. API 8개가 만료된 Access Token으로 요청된다.
7. 서버가 401 Unauthorized를 반환한다.
8. 최초 실패 요청이 Refresh 요청을 시작한다.
9. 나머지 실패 요청은 대기열에 들어간다.
10. 서버가 Refresh Token을 검증한다.
11. 새 Access Token을 발급한다.
12. 프론트엔드가 새 Access Token을 저장한다.
13. 대기 요청들이 새 Access Token으로 재시도된다.
14. 최종적으로 API 8개가 모두 성공한다.
```

---

## 25. 비정상 동작 예시

PoC 또는 실제 시스템에서 다음 흐름이 보이면 점검 대상입니다.

```text
1. API 요청 8개 실패 시 Refresh 요청도 8회 발생
2. Refresh 요청은 1회이나 최초 요청만 성공하고 나머지 요청 실패
3. Refresh 요청에 Access Token을 넣어도 새 Access Token 발급
4. 만료된 Access Token만으로 새 Access Token 발급
5. Refresh 실패 후 대기 요청이 계속 pending 상태 유지
6. Refresh 요청이 무한 반복
7. Access Token이 유효한 상태에서도 Refresh 요청 발생
8. 로그아웃 후에도 기존 Refresh Token으로 재발급 가능
```

---

## 26. 운영 적용 시 추가 검토사항

PoC는 개념 검증용이므로 운영 적용 전 다음 항목을 추가 검토해야 합니다.

```text
1. Refresh Token 저장소를 Redis 또는 DB로 변경
2. Refresh Token 원문 저장 대신 해시 저장
3. Refresh Token Rotation 적용
4. Refresh Token 재사용 탐지
5. Access Token 블랙리스트 적용 여부 검토
6. 로그아웃 및 강제 로그아웃 정책 구현
7. 다중 탭 환경에서 Refresh 중복 방지
8. 모바일 앱 환경에서 중복 요청 처리
9. CORS 및 Cookie 정책 정리
10. SameSite, Secure, HttpOnly Cookie 설정
11. 인증 로그 및 감사 로그 적재
12. 비정상 Refresh 빈도 탐지
13. Rate Limit 적용
14. 장애 시 fallback 정책
15. 성능시험 시 Refresh 요청 별도 집계
```

---

## 27. 다중 탭 환경 주의사항

PoC의 `isRefreshing`과 `failedQueue`는 단일 브라우저 탭 내에서만 동작합니다.

여러 탭이 동시에 열려 있는 경우 다음 문제가 발생할 수 있습니다.

```text
1. 각 탭에서 별도 Refresh 요청 발생
2. Refresh Token Rotation 사용 시 토큰 경합 발생
3. 한 탭의 로그아웃이 다른 탭에 즉시 반영되지 않음
4. 일부 탭에서 오래된 Access Token 사용
```

운영 환경에서는 다음 방식을 검토할 수 있습니다.

```text
1. BroadcastChannel
2. localStorage event
3. Service Worker
4. 서버 측 Refresh Lock
5. Redis 기반 사용자 세션 Lock
```

---

## 28. 서버 측 중복 Refresh 방어

프론트엔드에서 Refresh를 단일화하더라도 서버 측 방어가 필요합니다.

이유는 다음과 같습니다.

```text
1. 사용자가 여러 탭을 열 수 있음
2. 모바일 앱과 웹이 동시에 접근할 수 있음
3. 네트워크 재시도 또는 프록시 재전송이 발생할 수 있음
4. 악의적 사용자가 Refresh API를 직접 반복 호출할 수 있음
5. 프론트엔드 코드는 우회될 수 있음
```

운영 환경에서는 다음을 검토할 수 있습니다.

```text
1. 동일 사용자 기준 Refresh 요청 제한
2. 동일 Refresh Token 기준 재사용 탐지
3. Redis Lock
4. Rate Limit
5. Refresh Token Rotation
6. 이상 행위 로그 적재
```

---

## 29. 성능시험 관점 구현 메모

성능시험에서는 Refresh 요청을 업무 API와 구분해서 봐야 합니다.

확인 기준:

```text
1. 업무 API 요청 수
2. Refresh API 요청 수
3. Access Token 만료 시점
4. Refresh 요청 발생 시점
5. Refresh 중복 발생 여부
6. Refresh 실패 여부
7. Refresh로 인한 응답시간 증가 여부
8. 인증 서버 및 Redis/DB 부하
```

잘못된 구조에서는 업무 API보다 인증 갱신 트래픽이 과도하게 발생할 수 있습니다.

예시:

```text
사용자 1명
API 8개 인증 실패
Refresh 8회 발생

동시 사용자 100명
API 800개 인증 실패
Refresh 800회 발생 가능
```

정상 구조에서는 사용자 세션 기준 Refresh 요청이 단일화되어야 합니다.

---

## 30. 보안 관점 구현 메모

보안 관점에서 중요한 기준은 다음과 같습니다.

```text
1. Access Token은 API 접근권
2. Refresh Token은 재발급권
3. Access Token과 Refresh Token은 역할이 분리되어야 함
4. Access Token만으로 새 Access Token을 발급하면 안 됨
5. Refresh Token은 서버 측 검증 기준을 가져야 함
6. 로그아웃 시 Refresh Token은 폐기되어야 함
7. 강제 로그아웃 또는 계정 차단 시 재발급이 불가능해야 함
8. 반복 Refresh 요청은 탐지 가능해야 함
```

특히 다음 구조는 점검 대상입니다.

```text
만료된 Access Token만으로 새 Access Token 발급 가능
Refresh Token 존재 여부 불명확
Refresh Token 검증 저장소 없음
로그아웃 후에도 Refresh 가능
동일 Refresh Token 반복 사용 가능
```

---

## 31. PoC의 한계

본 PoC는 다음 한계를 가집니다.

```text
1. 실제 사용자 DB를 사용하지 않음
2. Refresh Token 저장소가 메모리 Map임
3. Refresh Token Rotation을 구현하지 않을 수 있음
4. 다중 서버 환경을 고려하지 않음
5. 다중 탭 동기화를 완전하게 처리하지 않음
6. 운영 수준의 감사 로그를 제공하지 않음
7. 실서비스 보안 정책을 모두 포함하지 않음
```

따라서 본 PoC는 운영 적용 코드가 아니라, 구조 설명 및 검증용 코드로 사용해야 합니다.

---

## 32. PoC로 확인 가능한 것

본 PoC로 확인 가능한 것은 다음입니다.

```text
1. Access Token 만료 시 보호 API가 401을 반환하는지
2. Refresh Token으로만 새 Access Token을 발급하는지
3. Access Token으로 Refresh 요청 시 거부되는지
4. 동시 401 상황에서 Refresh 요청이 1회만 발생하는지
5. 실패 요청이 대기 후 새 Access Token으로 재시도되는지
6. Refresh 실패 시 대기 요청이 정리되는지
```

---

## 33. PoC로 확인할 수 없는 것

본 PoC만으로 다음을 완전히 검증할 수는 없습니다.

```text
1. 운영 환경 전체 인증 안정성
2. 실제 금융권 보안 정책 적합성
3. 전체 세션 관리 정책
4. Refresh Token Rotation 완성도
5. 계정 잠금/탈퇴/권한 변경 반영
6. 다중 서버 환경 동기화
7. 실제 부하 상황에서의 병목
8. 보안 솔루션 연동 영향
```

해당 항목은 별도 설계 검토와 통합 테스트가 필요합니다.

---

## 34. 결론

본 PoC의 구현 핵심은 다음과 같습니다.

```text
백엔드:
Access Token과 Refresh Token을 구분한다.
Refresh Token으로만 새 Access Token을 발급한다.
Refresh Token은 서버 저장소와 대조한다.

프론트엔드:
401 응답을 감지한다.
Refresh 요청을 1회로 단일화한다.
동시에 실패한 요청은 대기열에 보관한다.
새 Access Token 발급 후 실패 요청을 재시도한다.
Refresh 실패 시 대기열과 토큰을 정리한다.
```

본 PoC는 JWT 갱신 구조에서 “요청이 여러 개 발생하는 것”과 “Refresh 요청이 중복 발생하는 것”을 분리해서 설명하기 위한 예제입니다.

요청이 여러 개 발생하는 것은 웹 구조상 정상일 수 있습니다.

그러나 Access Token 만료 시 Refresh 요청이 실패 요청 수만큼 발생하거나, Refresh 이후 일부 요청만 복구되는 구조는 성능과 보안 관점에서 점검이 필요합니다.
