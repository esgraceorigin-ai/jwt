# JWT Refresh PoC 테스트 시나리오

## 1. 문서 목적

본 문서는 JWT Refresh Single-Flight PoC의 테스트 절차와 정상/비정상 판정 기준을 정의하기 위한 문서입니다.

본 테스트의 목적은 다음과 같습니다.

```text
1. Access Token 만료 시 보호 API가 인증 실패하는지 확인
2. 여러 API 요청이 동시에 인증 실패했을 때 Refresh 요청이 1회만 발생하는지 확인
3. Refresh 성공 후 기존 실패 요청들이 새 Access Token으로 재시도되는지 확인
4. Refresh Token이 아닌 Access Token으로 Refresh가 가능한지 여부 확인
5. 성능시험 전 인증 갱신 구조가 정상인지 판단
```

---

## 2. 테스트 대상

본 PoC는 다음 구성요소를 대상으로 합니다.

```text
Backend  : Spring Boot
Frontend : React + Vite + Axios
Auth     : JWT Access Token + Refresh Token
```

백엔드 API는 다음과 같습니다.

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

---

## 3. 테스트 전제조건

테스트 전 다음 조건이 충족되어야 합니다.

```text
1. 백엔드 서버가 localhost:8080에서 실행 중이어야 한다.
2. 프론트엔드 서버가 localhost:5173에서 실행 중이어야 한다.
3. 프론트엔드는 /api 요청을 백엔드로 프록시해야 한다.
4. Access Token 만료시간은 테스트 편의를 위해 짧게 설정한다.
5. Refresh Token 만료시간은 Access Token보다 길게 설정한다.
6. 브라우저 개발자도구 Network 탭을 열어둔다.
7. Preserve log 옵션을 켜면 요청 흐름 확인이 쉽다.
```

권장 만료시간은 다음과 같습니다.

```text
Access Token  : 10초
Refresh Token : 30분
```

---

## 4. 테스트 계정

PoC 기준 테스트 계정은 다음과 같습니다.

```text
username: test
password: 1234
```

운영 환경 검증 시에는 실제 테스트 계정 정책에 맞게 별도 계정을 사용해야 합니다.

---

## 5. 시나리오 1: 로그인 및 토큰 발급 확인

### 5.1 목적

로그인 시 Access Token과 Refresh Token이 발급되는지 확인합니다.

### 5.2 절차

```text
1. 프론트엔드 화면에 접속한다.
2. 브라우저 개발자도구 Network 탭을 연다.
3. 로그인 버튼을 클릭한다.
4. POST /api/auth/login 요청을 확인한다.
5. 응답 Body에 accessToken과 refreshToken이 포함되는지 확인한다.
```

### 5.3 정상 결과

```text
POST /api/auth/login
→ HTTP 200 OK
→ accessToken 발급
→ refreshToken 발급
```

### 5.4 비정상 결과

```text
1. 로그인 요청이 401 또는 403으로 실패
2. accessToken이 응답되지 않음
3. refreshToken이 응답되지 않음
4. 프론트엔드가 토큰을 저장하지 못함
```

---

## 6. 시나리오 2: Access Token 유효 상태 API 호출

### 6.1 목적

Access Token이 유효한 상태에서 보호 API가 정상 호출되는지 확인합니다.

### 6.2 절차

```text
1. 로그인 직후 Access Token이 유효한 상태에서 API 8개 동시 호출 버튼을 클릭한다.
2. GET /api/test/data1 ~ /api/test/data8 요청을 확인한다.
3. 각 요청의 Authorization Header에 Access Token이 포함되는지 확인한다.
4. 각 요청이 200 OK로 응답되는지 확인한다.
5. 이 과정에서 /api/auth/refresh 요청이 발생하지 않는지 확인한다.
```

### 6.3 정상 결과

```text
GET /api/test/data1 ~ /api/test/data8
→ HTTP 200 OK

POST /api/auth/refresh
→ 발생하지 않음
```

### 6.4 비정상 결과

```text
1. Access Token이 유효한데도 401 발생
2. Access Token이 유효한데도 Refresh 요청 발생
3. 일부 API만 성공하고 일부 API가 실패
4. Authorization Header가 누락됨
```

---

## 7. 시나리오 3: Access Token 만료 후 단일 API 호출

### 7.1 목적

Access Token 만료 후 단일 보호 API 호출 시 Refresh가 정상 수행되고, 기존 요청이 재시도되는지 확인합니다.

### 7.2 절차

```text
1. 로그인한다.
2. Access Token 만료시간 이상 대기한다.
   예: Access Token 만료시간이 10초라면 10초 이상 대기
3. 단일 보호 API를 호출한다.
4. 최초 API 요청이 401로 실패하는지 확인한다.
5. POST /api/auth/refresh 요청이 발생하는지 확인한다.
6. Refresh 성공 후 최초 실패 요청이 새 Access Token으로 재시도되는지 확인한다.
```

### 7.3 정상 결과

```text
GET /api/test/data1
→ HTTP 401 Unauthorized

POST /api/auth/refresh
→ HTTP 200 OK
→ 새 Access Token 발급

GET /api/test/data1
→ HTTP 200 OK
```

### 7.4 비정상 결과

```text
1. Access Token 만료 후에도 보호 API가 200 OK로 처리됨
2. Refresh 요청이 발생하지 않음
3. Refresh는 성공했지만 기존 요청이 재시도되지 않음
4. Refresh 요청이 여러 번 발생
5. Refresh 이후에도 동일 요청이 계속 401 발생
```

---

## 8. 시나리오 4: Access Token 만료 후 API 8개 동시 호출

### 8.1 목적

본 PoC의 핵심 시나리오입니다.

Access Token 만료 상태에서 여러 API 요청이 동시에 인증 실패했을 때, Refresh 요청이 1회만 발생하고 기존 실패 요청들이 모두 재시도되는지 확인합니다.

### 8.2 절차

```text
1. 로그인한다.
2. Access Token 만료시간 이상 대기한다.
3. 브라우저 개발자도구 Network 탭을 연다.
4. API 8개 동시 호출 버튼을 클릭한다.
5. GET /api/test/data1 ~ /api/test/data8 요청이 발생하는지 확인한다.
6. 최초 요청들이 401 Unauthorized로 실패하는지 확인한다.
7. POST /api/auth/refresh 요청이 몇 번 발생하는지 확인한다.
8. Refresh 성공 후 GET /api/test/data1 ~ /api/test/data8 요청이 재시도되는지 확인한다.
9. 최종적으로 8개 요청이 모두 성공하는지 확인한다.
```

### 8.3 정상 결과

```text
GET /api/test/data1 ~ /api/test/data8
→ HTTP 401 Unauthorized

POST /api/auth/refresh
→ 1회 발생
→ HTTP 200 OK
→ 새 Access Token 발급

GET /api/test/data1 ~ /api/test/data8
→ 새 Access Token으로 재시도
→ HTTP 200 OK
```

화면 로그 예시는 다음과 같습니다.

```text
[TEST] API 8개 동시 호출 시작
[REQUEST] GET /test/data1
[REQUEST] GET /test/data2
[REQUEST] GET /test/data3
[REQUEST] GET /test/data4
[REQUEST] GET /test/data5
[REQUEST] GET /test/data6
[REQUEST] GET /test/data7
[REQUEST] GET /test/data8

[401] /test/data1 Access Token 만료 또는 인증 실패
[REFRESH-START] Refresh 요청 시작

[401] /test/data2 Access Token 만료 또는 인증 실패
[WAIT] Refresh 진행 중이므로 대기: /test/data2

[401] /test/data3 Access Token 만료 또는 인증 실패
[WAIT] Refresh 진행 중이므로 대기: /test/data3

[REFRESH-SUCCESS] 새 Access Token 발급 완료

[RETRY-FIRST] 최초 실패 요청 재시도: /test/data1
[QUEUE-RETRY] /test/data2
[QUEUE-RETRY] /test/data3
...
[TEST-END] 성공=8, 실패=0
```

### 8.4 정상 판정 기준

```text
1. Refresh 요청은 1회만 발생해야 한다.
2. 최초 실패 요청 1개만 성공해서는 안 된다.
3. 대기 중인 나머지 요청들도 모두 재시도되어야 한다.
4. 최종 결과는 성공 8개, 실패 0개여야 한다.
5. Network 탭에서 재시도 요청의 Authorization Header는 신규 Access Token이어야 한다.
```

### 8.5 비정상 결과

다음 결과는 구조 점검 대상입니다.

```text
1. Refresh 요청이 8회 발생
2. Refresh 요청은 1회이나 성공 1개, 실패 7개 발생
3. Refresh 성공 후 기존 실패 요청이 재시도되지 않음
4. Refresh 이후에도 기존 Access Token으로 재시도함
5. Refresh 요청이 무한 반복됨
6. 최종적으로 화면 오류 또는 일부 데이터 누락 발생
```

---

## 9. 시나리오 5: Refresh Token 없이 Refresh 시도

### 9.1 목적

Refresh Token이 없는 상태에서 Access Token 재발급이 거부되는지 확인합니다.

### 9.2 절차

```text
1. 로그인하지 않은 상태로 둔다.
2. Refresh 요청을 직접 호출한다.
3. 요청 Body에 refreshToken을 포함하지 않는다.
4. 서버 응답을 확인한다.
```

예시 요청:

```http
POST /api/auth/refresh
Content-Type: application/json

{}
```

### 9.3 정상 결과

```text
POST /api/auth/refresh
→ HTTP 401 Unauthorized
```

### 9.4 비정상 결과

```text
1. Refresh Token 없이 새 Access Token이 발급됨
2. 임의 사용자 기준으로 토큰이 발급됨
3. 서버가 어떤 사용자 세션인지 식별하지 못하는데도 재발급 수행
```

---

## 10. 시나리오 6: Access Token으로 Refresh 시도

### 10.1 목적

Access Token을 Refresh API에 전달했을 때 재발급이 거부되는지 확인합니다.

이 테스트는 Access Token과 Refresh Token의 역할 분리를 검증하기 위한 것입니다.

### 10.2 절차

```text
1. 로그인한다.
2. 발급된 Access Token을 복사한다.
3. POST /api/auth/refresh 요청 Body의 refreshToken 필드에 Access Token을 넣는다.
4. 서버 응답을 확인한다.
```

예시 요청:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<access_token>"
}
```

### 10.3 정상 결과

```text
POST /api/auth/refresh
→ HTTP 401 Unauthorized
→ Token is not refresh token
```

### 10.4 비정상 결과

```text
1. Access Token으로 새 Access Token이 발급됨
2. 만료된 Access Token으로도 새 Access Token이 발급됨
3. 서버가 token type을 구분하지 않음
```

비정상 결과가 발생하면 Access Token과 Refresh Token의 역할 분리가 불명확한 구조일 가능성이 있습니다.

---

## 11. 시나리오 7: 만료된 Refresh Token으로 Refresh 시도

### 11.1 목적

Refresh Token 만료 후 재발급이 거부되는지 확인합니다.

### 11.2 절차

```text
1. Refresh Token 만료시간을 짧게 설정한다.
   예: 30초
2. 로그인한다.
3. Refresh Token 만료시간 이상 대기한다.
4. Access Token 만료 후 보호 API를 호출한다.
5. Refresh 요청이 실패하는지 확인한다.
```

### 11.3 정상 결과

```text
POST /api/auth/refresh
→ HTTP 401 Unauthorized

프론트엔드:
→ 대기 중인 요청 전체 실패 처리
→ 토큰 정리
→ 로그인 화면 이동 또는 세션 만료 안내
```

### 11.4 비정상 결과

```text
1. 만료된 Refresh Token으로 새 Access Token 발급
2. Refresh 실패 후 대기 요청이 계속 대기 상태로 남음
3. Refresh 실패 후 무한 재시도 발생
4. 사용자 화면이 멈춤
```

---

## 12. 시나리오 8: 로그아웃 후 Refresh 시도

### 12.1 목적

로그아웃 또는 토큰 폐기 후 Refresh Token이 더 이상 사용되지 않는지 확인합니다.

### 12.2 절차

```text
1. 로그인한다.
2. 로그아웃 API를 호출한다.
3. 서버 측 Refresh Token 저장소에서 해당 토큰이 제거되는지 확인한다.
4. 기존 Refresh Token으로 /api/auth/refresh를 호출한다.
5. 서버 응답을 확인한다.
```

### 12.3 정상 결과

```text
POST /api/auth/logout
→ HTTP 200 OK

POST /api/auth/refresh
→ HTTP 401 Unauthorized
→ Refresh token not found or revoked
```

### 12.4 비정상 결과

```text
1. 로그아웃 후에도 기존 Refresh Token으로 새 Access Token 발급
2. 서버 저장소에서 Refresh Token이 제거되지 않음
3. 강제 로그아웃 또는 세션 만료 처리가 불가능함
```

---

## 13. 시나리오 9: Refresh 실패 시 대기열 정리

### 13.1 목적

Refresh 실패 시 대기 중이던 요청들이 정상적으로 실패 처리되는지 확인합니다.

### 13.2 절차

```text
1. 로그인한다.
2. 프론트엔드 또는 서버에서 Refresh Token을 제거하거나 잘못된 값으로 변경한다.
3. Access Token 만료시간 이상 대기한다.
4. API 8개 동시 호출 버튼을 클릭한다.
5. Refresh 요청이 실패하는지 확인한다.
6. 대기 중이던 요청들이 모두 실패 처리되는지 확인한다.
```

### 13.3 정상 결과

```text
GET /api/test/data1 ~ /api/test/data8
→ HTTP 401 Unauthorized

POST /api/auth/refresh
→ HTTP 401 Unauthorized

프론트엔드:
→ 대기열 전체 실패 처리
→ 토큰 제거
→ 최종 결과 실패 처리
→ 무한 대기 없음
```

### 13.4 비정상 결과

```text
1. 일부 요청이 Promise pending 상태로 남음
2. 화면이 계속 로딩 상태로 유지됨
3. Refresh 요청이 무한 반복됨
4. 토큰이 정리되지 않음
```

---

## 14. 시나리오 10: 성능시험 관점 확인

### 14.1 목적

인증 갱신 구조가 성능시험 결과를 왜곡하지 않는지 확인합니다.

### 14.2 확인 항목

```text
1. Access Token 만료 시 Refresh 요청이 실패 요청 수만큼 증가하지 않는가?
2. Refresh 요청이 인증 서버 병목을 만들지 않는가?
3. API 요청과 인증 갱신 요청이 구분되어 측정되는가?
4. 성능시험 중 토큰 만료 시점에 오류율이 급증하지 않는가?
5. 토큰 만료 후 사용자 시나리오가 정상 복구되는가?
```

### 14.3 정상 기준

```text
1. 메뉴 진입 시 API 요청 수는 업무 흐름 기준으로 발생
2. Access Token 만료 시 Refresh 요청은 사용자 세션 기준 1회로 제한
3. 기존 실패 요청은 새 Access Token으로 재시도
4. 인증 갱신 트래픽이 업무 API 성능 측정을 과도하게 왜곡하지 않음
```

---

## 15. Network 탭 확인 기준

브라우저 개발자도구 Network 탭에서는 다음 항목을 확인해야 합니다.

```text
1. 요청 URL
2. HTTP Method
3. HTTP Status Code
4. Authorization Header
5. Request Payload
6. Response Body
7. 요청 발생 순서
8. /api/auth/refresh 요청 횟수
9. 재시도 요청 여부
10. 재시도 요청의 Access Token 변경 여부
```

특히 핵심은 다음 두 가지입니다.

```text
/api/auth/refresh 요청이 몇 번 발생했는가?
Refresh 이후 기존 실패 요청들이 재시도되었는가?
```

---

## 16. 테스트 결과 기록 양식

테스트 결과는 다음 형식으로 기록할 수 있습니다.

| 항목                 | 결과 |
| ------------------ | -- |
| 테스트 일시             |    |
| 테스트자               |    |
| Access Token 만료시간  |    |
| Refresh Token 만료시간 |    |
| 동시 API 요청 수        | 8  |
| 최초 401 발생 수        |    |
| Refresh 요청 수       |    |
| 재시도 요청 수           |    |
| 최종 성공 수            |    |
| 최종 실패 수            |    |
| 비고                 |    |

---

## 17. 정상/비정상 판단 요약

| 구분                         | 정상            | 비정상                 |
| -------------------------- | ------------- | ------------------- |
| 유효한 Access Token API 호출    | 200 OK        | 401 또는 Refresh 발생   |
| 만료된 Access Token API 호출    | 401 후 Refresh | 무한 실패 또는 무한 Refresh |
| API 8개 동시 실패               | Refresh 1회    | Refresh 8회          |
| Refresh 후 기존 요청            | 전체 재시도        | 일부만 재시도             |
| Access Token으로 Refresh     | 거부            | 허용                  |
| Refresh Token 만료 후 Refresh | 거부            | 허용                  |
| 로그아웃 후 Refresh             | 거부            | 허용                  |
| Refresh 실패 시 대기열           | 전체 정리         | pending 또는 무한 대기    |

---

## 18. 결론

본 테스트 시나리오의 핵심은 API 요청이 여러 개 발생하는지 여부가 아닙니다.

핵심은 다음입니다.

```text
Access Token 만료 시 여러 요청이 동시에 실패하더라도
Refresh 요청은 1회만 발생해야 하며
실패 요청은 대기 후 새 Access Token으로 재시도되어야 한다.
```

이 조건이 만족되지 않으면 성능시험 시 인증 갱신 트래픽이 과도하게 발생하거나, 일부 요청 실패로 사용자 화면 오류가 발생할 수 있습니다.

따라서 성능시험 전 본 시나리오를 통해 JWT 갱신 구조의 정상 동작 여부를 확인해야 합니다.
