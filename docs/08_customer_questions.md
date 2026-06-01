# JWT 갱신 구조 고객사 확인 질문 목록

## 1. 문서 목적

본 문서는 JWT 기반 인증 및 Access Token 갱신 구조에 대해 고객사 또는 개발사 측에 확인이 필요한 항목을 정리한 문서입니다.

본 확인의 목적은 다음과 같습니다.

```text
1. 현재 인증 구조의 실제 동작 방식 확인
2. Access Token과 Refresh Token의 역할 분리 여부 확인
3. Access Token 만료 시 Refresh 처리 방식 확인
4. 동시 인증 실패 시 Refresh 중복 발생 여부 확인
5. 성능시험 수행 전 인증 흐름의 안정성 확인
6. 보안 관점에서 토큰 재발급 정책의 적정성 확인
```

본 문서는 특정 구현 방식이 반드시 틀렸다고 단정하기 위한 문서가 아니라, 현재 구조를 객관적으로 확인하기 위한 질의서입니다.

---

## 2. 핵심 확인 사항 요약

현재 확인이 필요한 핵심은 다음입니다.

```text
API 요청이 여러 개 발생하는 것이 문제가 아니라,
Access Token 만료 시 여러 요청이 인증 실패했을 때
Refresh 요청이 어떻게 처리되는지가 핵심입니다.
```

특히 다음 사항에 대한 확인이 필요합니다.

```text
1. Refresh Token이 실제로 존재하는가?
2. Refresh 요청 시 클라이언트가 서버에 전달하는 값은 무엇인가?
3. Refresh 요청은 Cookie, Header, Body 중 어디로 전달되는가?
4. 서버는 Refresh Token 또는 세션 값을 저장소와 대조하는가?
5. 만료된 Access Token만으로도 새 Access Token이 발급되는가?
6. 동시에 여러 API가 인증 실패하면 Refresh 요청은 몇 번 발생하는가?
7. Refresh 성공 후 기존 실패 요청들은 자동 재시도되는가?
```

---

## 3. 토큰 구조 관련 질문

### 3.1 Access Token

다음 항목 확인이 필요합니다.

```text
1. Access Token의 만료시간은 얼마입니까?
2. Access Token은 JWT 형식입니까?
3. Access Token의 subject 값은 무엇입니까?
   - userId
   - loginId
   - UUID
   - sessionId
   - 기타
4. Access Token에 포함된 주요 claim은 무엇입니까?
5. Access Token에 token type 정보가 포함되어 있습니까?
   예: type=access
6. Access Token은 서버 측 저장소에 별도로 저장됩니까?
7. Access Token 폐기 또는 블랙리스트 정책이 있습니까?
```

---

### 3.2 Refresh Token

다음 항목 확인이 필요합니다.

```text
1. Refresh Token이 별도로 존재합니까?
2. Refresh Token도 JWT 형식입니까?
3. Refresh Token의 만료시간은 얼마입니까?
4. Refresh Token에 token type 정보가 포함되어 있습니까?
   예: type=refresh
5. Refresh Token은 클라이언트에서 어디에 보관됩니까?
   - HttpOnly Secure Cookie
   - 일반 Cookie
   - LocalStorage
   - SessionStorage
   - Memory
   - 모바일 앱 내부 저장소
   - 클라이언트에는 보관하지 않음
6. Refresh Token은 서버에서 어디에 저장됩니까?
   - DB
   - Redis
   - Session Store
   - Memory
   - 저장하지 않음
7. 서버 저장 시 원문으로 저장합니까, 해시로 저장합니까?
8. Refresh Token 폐기 정책이 있습니까?
9. Refresh Token Rotation을 사용합니까?
10. Refresh Token 재사용 탐지 정책이 있습니까?
```

---

## 4. Refresh 요청 방식 관련 질문

`/refresh` 또는 Access Token 재발급 API에 대해 다음 확인이 필요합니다.

```text
1. Access Token 재발급 API의 정확한 URL은 무엇입니까?
2. Refresh 요청의 HTTP Method는 무엇입니까?
   - GET
   - POST
   - PUT
   - 기타
3. Refresh 요청 시 클라이언트가 서버에 전달하는 값은 무엇입니까?
4. 해당 값은 어디에 포함됩니까?
   - Authorization Header
   - 별도 Header
   - Request Body
   - Cookie
   - Query Parameter
5. Refresh 요청 시 기존 Access Token을 함께 전달합니까?
6. Refresh 요청 시 만료된 Access Token을 전달합니까?
7. Refresh Token 없이도 Access Token 재발급이 가능합니까?
8. Access Token만으로도 Access Token 재발급이 가능합니까?
9. Refresh 요청 성공 시 새 Access Token만 발급합니까?
10. Refresh 요청 성공 시 Refresh Token도 함께 재발급합니까?
```

---

## 5. 서버 측 검증 기준 관련 질문

서버가 Refresh 요청을 받았을 때 어떤 기준으로 새 Access Token을 발급하는지 확인이 필요합니다.

```text
1. Refresh 요청 수신 시 서버는 어떤 값을 기준으로 사용자를 식별합니까?
2. Refresh Token의 서명을 검증합니까?
3. Refresh Token의 만료시간을 검증합니까?
4. Refresh Token의 token type을 검증합니까?
5. Refresh Token이 서버 저장소에 존재하는지 대조합니까?
6. Refresh Token이 폐기되었는지 확인합니까?
7. 사용자 계정 상태를 확인합니까?
   - 활성
   - 잠금
   - 탈퇴
   - 비활성
8. 세션 만료 여부를 확인합니까?
9. 강제 로그아웃 여부를 확인합니까?
10. 동일 Refresh Token 재사용 여부를 탐지합니까?
```

---

## 6. 만료된 Access Token 기반 재발급 관련 질문

현재 구조에서 가장 중요한 확인 항목입니다.

```text
1. 만료된 Access Token을 /refresh API에 전달하면 새 Access Token이 발급됩니까?
2. 발급된다면, 서버는 만료된 Access Token 외에 어떤 값을 추가로 검증합니까?
3. 만료된 Access Token은 단순 subject 추출용입니까?
4. 실제 재발급 권한은 Refresh Token 또는 서버 세션으로 검증됩니까?
5. 만료된 Access Token만 있고 Refresh Token 또는 세션 값이 없어도 재발급이 가능합니까?
6. Access Token 탈취 시 공격자가 Refresh API를 통해 계속 새 Access Token을 받을 수 있습니까?
7. Access Token 만료시간을 짧게 설정한 보안상 목적은 무엇입니까?
8. 현재 재발급 구조가 그 목적을 유지하고 있습니까?
```

정상적인 구조라면 다음 중 하나가 명확해야 합니다.

```text
1. Refresh Token을 통해 재발급한다.
2. HttpOnly Cookie 기반 세션 또는 Refresh Token을 통해 재발급한다.
3. 서버 세션 저장소를 통해 재발급 권한을 검증한다.
```

반대로 다음 구조라면 보안 검토가 필요합니다.

```text
만료된 Access Token만으로 새 Access Token 재발급 가능
```

---

## 7. 동시 요청 및 Refresh 중복 관련 질문

화면 하나에서 여러 API 요청이 동시에 발생하는 경우에 대한 확인이 필요합니다.

```text
1. 하나의 화면 진입 시 평균적으로 몇 개의 API 요청이 발생합니까?
2. 해당 API 요청들은 병렬로 발생합니까, 순차적으로 발생합니까?
3. Access Token 만료 상태에서 여러 API가 동시에 호출되면 각각 어떤 응답을 받습니까?
4. 동시에 8개 API가 401을 받으면 Refresh 요청은 몇 번 발생합니까?
5. Refresh 요청은 클라이언트에서 1회로 제한됩니까?
6. Refresh 진행 중 발생한 다른 실패 요청은 대기 처리됩니까?
7. Refresh 성공 후 기존 실패 요청들은 자동 재시도됩니까?
8. Refresh 요청을 1회로 제한했을 때 최초 요청만 성공하고 나머지 요청이 실패한 이력이 있습니까?
9. 해당 이력이 있다면 현재는 어떤 방식으로 처리하고 있습니까?
10. Refresh 중복 방지를 위한 lock, queue, single-flight 구조가 있습니까?
```

---

## 8. 프론트엔드 구현 관련 질문

프론트엔드 또는 클라이언트 영역에 대한 확인 사항입니다.

```text
1. API 호출은 공통 API Client를 통해 수행됩니까?
2. Axios Interceptor, Fetch Wrapper, 공통 HTTP Client 등이 존재합니까?
3. 401 응답 수신 시 공통 처리 로직이 있습니까?
4. Refresh API 호출 로직은 어디에 구현되어 있습니까?
5. 각 화면 또는 각 API 호출부마다 Refresh 로직이 별도 구현되어 있습니까?
6. Refresh 진행 여부를 나타내는 상태값이 있습니까?
   예: isRefreshing
7. 실패 요청 대기열이 있습니까?
   예: failedQueue
8. Refresh 성공 후 기존 실패 요청을 재시도합니까?
9. 동일 요청의 무한 재시도를 방지하는 플래그가 있습니까?
   예: _retry
10. Refresh 실패 시 대기 중인 요청들을 모두 실패 처리합니까?
11. Refresh 실패 시 로그인 화면으로 이동합니까?
12. Refresh API 자체가 Interceptor의 자동 Refresh 대상에서 제외되어 있습니까?
```

---

## 9. 백엔드 구현 관련 질문

백엔드 영역에 대한 확인 사항입니다.

```text
1. JWT 검증 필터는 어디에 구현되어 있습니까?
2. Access Token 검증 실패 시 어떤 응답코드를 반환합니까?
   - 401
   - 403
   - 200 + 별도 에러코드
   - 기타
3. Access Token 만료와 권한 부족을 구분합니까?
4. Refresh API는 인증 필터 대상에서 제외되어 있습니까?
5. Refresh API에서 Access Token과 Refresh Token을 구분합니까?
6. 서버는 Refresh Token 저장소를 사용합니까?
7. 서버는 동일 사용자 기준 동시 Refresh 요청을 제한합니까?
8. Refresh Token Rotation을 적용합니까?
9. 로그아웃 시 Refresh Token을 폐기합니까?
10. 강제 로그아웃 시 기존 Refresh Token을 폐기할 수 있습니까?
11. Access Token 또는 Refresh Token 블랙리스트가 있습니까?
12. Refresh 요청 성공/실패 로그가 남습니까?
```

---

## 10. Cookie 사용 여부 관련 질문

Refresh Token이 Cookie 기반일 가능성이 있으므로 다음 확인이 필요합니다.

```text
1. Refresh Token이 Cookie로 전달됩니까?
2. Cookie 이름은 무엇입니까?
3. Cookie에 HttpOnly 속성이 적용되어 있습니까?
4. Cookie에 Secure 속성이 적용되어 있습니까?
5. Cookie에 SameSite 속성이 적용되어 있습니까?
6. Refresh 요청 시 Cookie가 자동 전송됩니까?
7. CORS 환경에서 credentials 설정이 되어 있습니까?
8. Access-Control-Allow-Credentials 설정이 되어 있습니까?
9. Cookie Domain과 Path는 어떻게 설정되어 있습니까?
10. 운영 환경과 개발 환경의 Cookie 정책이 다릅니까?
```

HttpOnly Cookie 방식인 경우, JavaScript에서 Refresh Token이 보이지 않는 것은 정상일 수 있습니다.

그러나 이 경우에도 브라우저가 Refresh 요청 시 Cookie를 서버로 전송해야 하며, 서버는 해당 값을 기준으로 재발급 권한을 검증해야 합니다.

---

## 11. CORS 및 Header 관련 질문

CORS 환경에서 Authorization Header와 Cookie 전달 여부를 확인해야 합니다.

```text
1. 프론트엔드와 백엔드의 Origin이 다릅니까?
2. Authorization Header가 CORS 허용 Header에 포함되어 있습니까?
3. Content-Type Header가 CORS 허용 Header에 포함되어 있습니까?
4. Cookie 기반 인증인 경우 credentials 설정이 되어 있습니까?
5. Preflight OPTIONS 요청은 정상 처리됩니까?
6. OPTIONS 요청에도 인증 필터가 적용됩니까?
7. Refresh 요청 시 Authorization Header를 재사용합니까?
8. Refresh 요청 시 기존 API 요청 Header를 그대로 복사합니까?
9. 만료된 Authorization Header가 Refresh 요청에 그대로 포함됩니까?
10. Refresh API에서 Authorization Header를 검증합니까, 무시합니까?
```

특히 다음 항목은 중요합니다.

```text
Refresh 요청 시 기존 API 요청의 Authorization Header를 그대로 재사용하는가?
```

해당 구조라면 Access Token과 Refresh Token의 역할 분리가 불명확해질 수 있습니다.

---

## 12. 로그 및 증적 관련 요청

말로 설명하는 것보다 요청/응답 로그로 확인하는 것이 가장 정확합니다.

다음 증적 제공을 요청합니다.

```text
1. 로그인 요청/응답 캡처
2. Access Token 유효 상태의 API 요청/응답 캡처
3. Access Token 만료 상태의 API 요청/응답 캡처
4. Refresh 요청/응답 캡처
5. Refresh 성공 후 기존 실패 요청 재시도 캡처
6. Refresh 실패 시 응답 캡처
7. 로그아웃 요청/응답 캡처
8. 로그아웃 후 Refresh 재시도 캡처
```

각 캡처에는 다음 정보가 포함되어야 합니다.

```text
1. Request URL
2. HTTP Method
3. Request Header
4. Request Body
5. Response Status Code
6. Response Header
7. Response Body
8. 요청 발생 순서
9. 요청 발생 시간
```

민감정보는 마스킹 후 제공할 수 있습니다.

---

## 13. 성능시험 관련 질문

성능시험 수행 전 다음 확인이 필요합니다.

```text
1. 성능시험은 실제 운영 인증 흐름을 기준으로 수행합니까?
2. 테스트 편의를 위해 장기 유효 Access Token을 별도로 발급합니까?
3. 장기 유효 토큰을 사용하는 경우 실제 사용자 인증 만료/갱신 흐름은 별도로 검증합니까?
4. Access Token 만료 시점이 성능시험 중 발생합니까?
5. 성능시험 계정의 Refresh Token 정책은 운영 사용자와 동일합니까?
6. 동시 사용자 증가 시 Refresh 요청도 함께 증가합니까?
7. Refresh 요청은 TPS 집계에서 업무 API와 구분됩니까?
8. Refresh 실패가 오류율에 포함됩니까?
9. 인증 서버, DB, Redis 부하를 별도 모니터링합니까?
10. 토큰 만료 시점의 응답시간과 오류율 변화를 별도 분석합니까?
```

장기 유효 토큰으로 성능시험을 수행할 경우, 다음 사항을 명확히 구분해야 합니다.

```text
1. 업무 API 처리 성능 측정
2. 실제 사용자 인증 만료/갱신 흐름 검증
```

장기 토큰은 성능시험 진행을 위한 우회 수단이 될 수 있으나, 운영 인증 흐름의 정상성을 검증하지는 못합니다.

---

## 14. 보안 관점 질문

보안 관점에서는 다음 항목 확인이 필요합니다.

```text
1. Access Token 탈취 시 영향 범위는 어디까지입니까?
2. Refresh Token 탈취 시 영향 범위는 어디까지입니까?
3. Access Token 만료시간을 짧게 설정한 보안 목적은 무엇입니까?
4. 현재 Refresh 구조가 해당 목적을 유지합니까?
5. 로그아웃 시 Access Token과 Refresh Token은 어떻게 처리됩니까?
6. 강제 로그아웃 시 기존 토큰은 어떻게 무효화됩니까?
7. Refresh Token 재사용 공격을 탐지합니까?
8. 동일 Refresh Token으로 반복 재발급이 가능합니까?
9. 동일 사용자 기준 비정상 Refresh 빈도 탐지가 가능합니까?
10. Token Rotation을 적용하지 않는다면 그 사유는 무엇입니까?
```

---

## 15. 최종 확인 요청 문구

고객사 또는 개발사에 전달할 때는 다음 문구를 사용할 수 있습니다.

```text
현재 확인이 필요한 사항은 API 요청이 여러 개 발생하는 것 자체가 아닙니다.

핵심은 Access Token 만료 시 여러 API 요청이 동시에 인증 실패했을 때,
Refresh 요청이 실패 요청 수만큼 중복 발생하는지,
또는 Refresh 요청 1회 이후 기존 실패 요청들이 정상적으로 재시도되는지 여부입니다.

또한 Refresh 요청 시 서버가 어떤 값을 근거로 새 Access Token을 발급하는지 확인이 필요합니다.

특히 만료된 Access Token만으로 새 Access Token이 재발급되는 구조인지,
별도 Refresh Token 또는 서버 세션 값을 검증하는 구조인지 명확히 확인이 필요합니다.

해당 사항은 성능시험 결과 신뢰성과 인증 구조 안정성에 영향을 줄 수 있으므로,
요청/응답 캡처와 서버 측 검증 기준을 기준으로 확인 부탁드립니다.
```

---

## 16. 답변 요청 양식

아래 양식으로 답변을 요청할 수 있습니다.

| 구분                           | 고객사/개발사 답변 |
| ---------------------------- | ---------- |
| Access Token 만료시간            |            |
| Refresh Token 존재 여부          |            |
| Refresh Token 전달 위치          |            |
| Refresh Token 서버 저장 위치       |            |
| Refresh API URL              |            |
| Refresh API Method           |            |
| Refresh 요청 시 전달 값            |            |
| 만료 Access Token만으로 재발급 가능 여부 |            |
| 동시 401 발생 시 Refresh 요청 횟수    |            |
| Refresh 성공 후 실패 요청 재시도 여부    |            |
| Refresh 실패 시 처리 방식           |            |
| 로그아웃 시 Refresh Token 폐기 여부   |            |
| 강제 로그아웃 지원 여부                |            |
| Refresh Token Rotation 적용 여부 |            |
| 반복 Refresh 요청 탐지 여부          |            |

---

## 17. 정리

본 확인 요청의 핵심은 다음과 같습니다.

```text
요청이 여러 개 발생하는 원인은 별도 확인 대상입니다.
하지만 요청이 여러 개 발생한다는 사실이 Refresh 요청 중복을 정당화하지는 않습니다.

정상 구조에서는 Access Token 만료 시 Refresh 요청은 1회로 제한되고,
동시에 실패한 요청들은 대기 후 새 Access Token으로 재시도되어야 합니다.

또한 Access Token과 Refresh Token의 역할이 명확히 분리되어야 하며,
서버는 Refresh 요청 시 유효한 Refresh Token 또는 세션 값을 기준으로 새 Access Token을 발급해야 합니다.
```
