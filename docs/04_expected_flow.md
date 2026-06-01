# 정상 JWT 갱신 흐름 기준

## 1. 문서 목적

본 문서는 Access Token 만료 시 정상적으로 기대되는 JWT 갱신 흐름을 정의하기 위한 문서입니다.

본 문서의 목적은 다음과 같습니다.

```text
1. Access Token과 Refresh Token의 역할 구분
2. Access Token 만료 전/후 정상 처리 흐름 정의
3. 동시 API 요청 상황에서 Refresh 요청 단일화 기준 정의
4. 실패 요청 대기 및 재시도 기준 정의
5. 불필요한 401 응답을 줄이기 위한 요청 전 갱신 기준 제공
6. 성능시험 전 확인해야 할 인증 흐름 기준 제공
```

---

## 2. 기본 전제

JWT 기반 인증에서 일반적으로 Access Token과 Refresh Token은 역할이 다릅니다.

| 구분            | 역할               | 수명      | 사용 위치      |
| ------------- | ---------------- | ------- | ---------- |
| Access Token  | API 접근 인증        | 짧음      | 일반 API 요청  |
| Refresh Token | Access Token 재발급 | 상대적으로 김 | Refresh 요청 |

Access Token은 일반 API 요청 시 사용자 인증을 증명하는 값입니다.

Refresh Token은 Access Token이 만료되었거나 곧 만료될 때 새 Access Token을 발급받기 위한 값입니다.

따라서 Access Token이 만료되었을 때, 만료된 Access Token 자체만으로 새 Access Token이 계속 발급되는 구조는 Access Token과 Refresh Token의 역할 분리가 불명확해질 수 있습니다.

---

## 3. 정상 로그인 흐름

정상 로그인 흐름은 다음과 같습니다.

```text
1. 사용자가 로그인 정보를 입력한다.
2. 클라이언트가 로그인 API를 호출한다.
3. 서버가 사용자 인증 정보를 검증한다.
4. 인증 성공 시 Access Token과 Refresh Token을 발급한다.
5. 클라이언트는 Access Token을 API 요청에 사용한다.
6. Refresh Token은 정책에 따라 Cookie, Header, Body, App Storage 등에 저장 또는 전달된다.
7. 서버는 Refresh Token의 유효성 검증을 위해 DB, Redis, Session Store 등에 저장하거나 식별 가능하도록 관리한다.
```

예시 흐름은 다음과 같습니다.

```text
POST /api/auth/login
→ 사용자 인증 성공
→ Access Token 발급
→ Refresh Token 발급
→ 이후 API 요청 시 Access Token 사용
```

---

## 4. 정상 API 요청 흐름

Access Token이 유효한 경우 일반 API 요청 흐름은 다음과 같습니다.

```text
1. 클라이언트가 API 요청을 준비한다.
2. 클라이언트가 Access Token의 만료시간을 확인한다.
3. Access Token이 유효하면 Authorization Header에 Access Token을 포함한다.
4. 서버가 Access Token의 서명, 만료시간, 토큰 타입을 검증한다.
5. 검증 성공 시 요청을 처리한다.
6. 서버가 정상 응답을 반환한다.
```

예시:

```http
GET /api/test/data1
Authorization: Bearer <access_token>
```

정상 응답:

```http
HTTP/1.1 200 OK
```

이 흐름에서는 Refresh 요청이 발생하지 않아야 합니다.

Access Token이 유효한 상태에서 불필요하게 Refresh 요청이 발생한다면 인증 갱신 조건을 점검해야 합니다.

---

## 5. Access Token 만료 전 선 Refresh 흐름

Access Token이 이미 만료되었거나 곧 만료될 것으로 판단되는 경우, 클라이언트는 API 요청을 먼저 보내기보다 Refresh를 선행할 수 있습니다.

이 방식은 불필요한 401 응답을 줄이는 데 목적이 있습니다.

정상 흐름은 다음과 같습니다.

```text
1. 클라이언트가 API 요청을 준비한다.
2. API 요청 전 Access Token의 exp 값을 확인한다.
3. Access Token이 만료되었거나 곧 만료 예정이면 API 요청을 대기시킨다.
4. 클라이언트가 Refresh 요청을 먼저 수행한다.
5. 서버는 Refresh Token 또는 세션 식별값을 검증한다.
6. 검증 성공 시 새 Access Token을 발급한다.
7. 클라이언트는 새 Access Token을 저장한다.
8. 대기 중이던 API 요청을 새 Access Token으로 전송한다.
9. API 요청이 정상 처리된다.
```

정상 흐름 요약:

```text
API 요청 준비
→ Access Token 만료 또는 만료 임박 확인
→ API 요청 대기
→ Refresh Token 검증
→ 새 Access Token 발급
→ 새 Access Token으로 API 요청
→ 성공
```

이 방식의 핵심은 다음입니다.

```text
API를 먼저 실패시키지 않는다.
Refresh를 먼저 수행한다.
Refresh 완료 전까지 API 요청을 대기시킨다.
새 Access Token으로 API를 처음부터 보낸다.
```

---

## 6. Access Token 만료 후 401 복구 흐름

요청 전 만료 체크를 적용하더라도 401 응답 후 복구 흐름은 반드시 유지해야 합니다.

이유는 다음과 같습니다.

```text
1. 클라이언트 시간과 서버 시간이 다를 수 있다.
2. 네트워크 지연 중 Access Token이 만료될 수 있다.
3. 서버에서 Access Token이 강제 폐기될 수 있다.
4. 다른 탭 또는 다른 기기에서 로그아웃되었을 수 있다.
5. 서버의 인증 정책이 클라이언트 판단보다 우선한다.
```

따라서 401 응답을 받은 경우 정상 흐름은 다음과 같습니다.

```text
1. 클라이언트가 Access Token으로 API를 요청한다.
2. 서버가 Access Token 만료 또는 인증 실패를 감지한다.
3. 서버는 401 Unauthorized 또는 사전에 정의된 인증 실패 응답을 반환한다.
4. 클라이언트는 401 응답을 감지한다.
5. 클라이언트는 Refresh 요청을 수행한다.
6. 서버는 Refresh Token 또는 세션 식별값을 검증한다.
7. 검증 성공 시 새 Access Token을 발급한다.
8. 클라이언트는 새 Access Token으로 기존 실패 요청을 재시도한다.
9. 기존 요청이 정상 처리된다.
```

정상 흐름 요약:

```text
API 요청
→ 401 응답
→ Refresh Token 검증
→ 새 Access Token 발급
→ 기존 요청 재시도
→ 성공
```

---

## 7. 동시 API 요청 상황

웹 화면에서는 하나의 메뉴 또는 화면 진입 시 여러 API 요청이 동시에 또는 짧은 시간 내에 발생할 수 있습니다.

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

이러한 다중 요청 자체는 일반적인 웹 구조일 수 있습니다.

문제는 Access Token이 만료된 상태에서 여러 요청이 동시에 발생할 때입니다.

정상 구조에서는 가능한 경우 API 요청을 먼저 실패시키기보다, 요청 전 만료 체크를 통해 Refresh를 먼저 수행하고 나머지 요청을 대기시키는 것이 바람직합니다.

---

## 8. 동시 요청 시 요청 전 Refresh 정상 흐름

Access Token이 만료된 상태에서 API 요청 8개가 동시에 발생하려는 경우, 정상 구조는 다음과 같습니다.

```text
1. API 요청 8개가 동시에 준비된다.
2. 공통 API 클라이언트가 Access Token 만료 여부를 확인한다.
3. 최초 1개 요청만 Refresh 요청을 시작한다.
4. 나머지 7개 요청은 Refresh 완료까지 대기한다.
5. Refresh Token 검증 성공 시 새 Access Token이 발급된다.
6. 대기 중이던 요청들이 새 Access Token을 전달받는다.
7. API 요청 8개가 새 Access Token으로 전송된다.
8. 최종적으로 8개 요청이 모두 정상 처리된다.
```

핵심 기준:

```text
API 요청 전 만료 확인
Refresh 요청은 1회
나머지 요청은 대기
새 Access Token 발급 후 API 전송
불필요한 401 최소화
```

이 방식에서는 Network 탭에 401이 대량으로 발생하지 않는 것이 정상입니다.

---

## 9. 동시 인증 실패 시 401 후 복구 정상 흐름

요청 전 만료 체크가 실패하거나 서버 판단상 401이 발생한 경우, 다음 흐름으로 복구해야 합니다.

```text
1. API 요청 8개가 동시에 발생한다.
2. 서버가 Access Token 만료 또는 인증 실패로 401을 반환한다.
3. 최초 1개 요청만 Refresh 요청을 시작한다.
4. 나머지 실패 요청은 Refresh 완료까지 대기열에 등록된다.
5. Refresh Token 검증 성공 시 새 Access Token이 발급된다.
6. 대기 중이던 요청들이 새 Access Token을 전달받는다.
7. 기존 실패 요청 8개가 새 Access Token으로 재시도된다.
8. 최종적으로 8개 요청이 모두 정상 처리된다.
```

핵심 기준:

```text
Refresh 요청은 1회
실패 요청은 대기
새 Access Token 발급 후 재시도
```

---

## 10. 비정상 흐름 예시 1: Refresh 요청 중복 발생

다음 흐름은 비정상 또는 점검 대상입니다.

```text
1. API 요청 8개가 동시에 발생한다.
2. Access Token 만료로 8개 요청이 인증 실패한다.
3. 각 실패 요청이 개별적으로 Refresh 요청을 수행한다.
4. Refresh 요청이 8회 발생한다.
5. 동일하거나 유사한 새 Access Token이 여러 번 발급된다.
6. 인증 서버 부하가 증가한다.
7. 성능시험 결과에 인증 갱신 트래픽이 과도하게 반영된다.
```

이 구조는 다음 문제를 유발할 수 있습니다.

```text
1. 인증 서버 부하 증가
2. DB 또는 Redis 부하 증가
3. 네트워크 요청 증가
4. 응답시간 증가
5. 사용자 화면 지연
6. 오류율 증가
7. 성능시험 결과 왜곡
```

---

## 11. 비정상 흐름 예시 2: Refresh는 1회이나 일부 요청만 복구

다음 흐름도 점검 대상입니다.

```text
1. API 요청 8개가 동시에 발생한다.
2. Access Token 만료로 8개 요청이 인증 실패한다.
3. Refresh 요청은 1회만 발생한다.
4. 새 Access Token이 발급된다.
5. 최초 실패 요청 1개만 재시도된다.
6. 나머지 7개 요청은 실패 상태로 종료된다.
```

이 경우 Refresh 요청 수는 줄었지만, 사용자 화면은 정상 복구되지 않을 수 있습니다.

따라서 정상 구조는 단순히 Refresh 요청을 1회로 제한하는 것이 아니라, 실패 요청 대기열과 재시도 처리를 함께 포함해야 합니다.

---

## 12. 클라이언트 측 정상 구현 기준

클라이언트 측에서는 공통 API 클라이언트 영역에서 Refresh 처리를 관리해야 합니다.

예시 위치:

```text
Axios Interceptor
Fetch Wrapper
공통 API Client
HTTP Client Middleware
모바일 앱 Interceptor
```

정상 구현 기준은 다음과 같습니다.

```text
1. API 요청 전 Access Token 만료시간 확인
2. 만료 또는 만료 임박 시 Refresh 선행
3. Refresh 진행 여부 확인
4. Refresh 진행 중이면 후속 요청은 대기
5. Refresh 성공 시 새 Access Token 저장
6. 대기 중인 요청에 새 Access Token 전달
7. 새 Access Token으로 API 요청 수행
8. 요청 전 처리로 해결되지 않은 401 응답 감지
9. 401 발생 시 Refresh 요청 단일화
10. Refresh 진행 중이면 실패 요청을 대기열에 등록
11. Refresh 성공 시 실패 요청 재시도
12. Refresh 실패 시 대기 요청 전체 실패 처리
13. 토큰 정리 및 세션 만료 처리
14. 무한 재시도 방지
```

각 화면 또는 각 API 호출부에 Refresh 로직을 개별 구현하면 중복 Refresh, 무한 재시도, 요청 누락 문제가 발생할 수 있습니다.

---

## 13. 서버 측 정상 구현 기준

서버 측에서는 Refresh 요청에 대해 명확한 검증 기준을 가져야 합니다.

정상 구현 기준은 다음과 같습니다.

```text
1. Refresh Token 또는 세션 식별값 수신
2. 토큰 서명 검증
3. 토큰 만료 여부 검증
4. 토큰 타입 검증
5. 서버 저장소와 대조
6. 폐기 여부 확인
7. 사용자 상태 확인
8. 새 Access Token 발급
9. 필요 시 Refresh Token Rotation 수행
10. Refresh 성공/실패 로그 기록
```

특히 다음 조건은 중요합니다.

```text
Access Token으로 Refresh 불가
Refresh Token으로만 Access Token 재발급
만료 또는 폐기된 Refresh Token 거부
서버 저장소에 없는 Refresh Token 거부
```

---

## 14. Access Token과 Refresh Token 타입 검증

Access Token과 Refresh Token이 모두 JWT 형식일 경우, 토큰 내부에 타입 정보를 포함할 수 있습니다.

예시:

```text
Access Token:
type = access

Refresh Token:
type = refresh
```

서버는 API 요청과 Refresh 요청에서 토큰 타입을 구분해야 합니다.

```text
일반 API 요청:
type=access 토큰만 허용

Refresh 요청:
type=refresh 토큰만 허용
```

따라서 Refresh API에 Access Token이 전달되면 서버는 이를 거부해야 합니다.

---

## 15. Refresh 실패 시 정상 처리

Refresh 요청이 실패하는 경우 클라이언트는 대기 중인 요청을 계속 보관하면 안 됩니다.

정상 처리 기준은 다음과 같습니다.

```text
1. 대기 중인 요청 전체 실패 처리
2. 저장된 Access Token 제거
3. 저장된 Refresh Token 제거 또는 무효화
4. 로그인 화면 이동
5. 사용자에게 세션 만료 안내
6. 필요 시 로그아웃 API 호출
```

Refresh 실패 후에도 대기 요청이 남아 있으면 화면이 멈추거나 무한 대기 상태가 될 수 있습니다.

---

## 16. 정상 흐름 검증 기준

정상 흐름은 다음 조건으로 검증할 수 있습니다.

```text
1. Access Token이 유효한 경우 보호 API 호출 시 200 OK 발생
2. Access Token이 만료되었거나 곧 만료될 경우 API 요청 전 Refresh가 1회 수행됨
3. 요청 전 Refresh 성공 후 API 요청들이 새 Access Token으로 전송됨
4. 요청 전 Refresh가 적용된 경우 불필요한 401 응답이 대량 발생하지 않음
5. 서버에서 401이 반환되는 경우에도 Refresh 요청은 1회만 발생함
6. Refresh 요청에는 Refresh Token 또는 세션 식별값이 사용됨
7. Access Token만으로 Refresh가 수행되지 않음
8. Refresh 성공 후 기존 실패 요청들이 재시도됨
9. 최종적으로 API 요청들이 모두 성공함
10. Refresh 실패 시 전체 요청이 정리되고 세션 만료 처리됨
```

---

## 17. 정리

정상적인 JWT 갱신 구조의 핵심은 다음과 같습니다.

```text
Access Token은 API 접근용
Refresh Token은 Access Token 재발급용
Access Token 만료 또는 만료 임박 시 Refresh Token으로 재발급
가능하면 API 요청 전에 Refresh를 선행하여 불필요한 401을 줄임
동시 요청 시 Refresh 요청은 1회만 수행
나머지 요청은 대기 후 새 Access Token으로 진행
401이 발생한 경우에도 Refresh 요청은 1회만 수행
실패 요청은 대기 후 재시도
Refresh 실패 시 전체 세션 정리
```

따라서 본 이슈의 핵심은 API 요청이 여러 개 발생하는지 여부가 아니라, Access Token 만료 시 여러 요청이 어떻게 대기·갱신·복구되는지입니다.
