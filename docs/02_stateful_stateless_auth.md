# Stateful / Stateless 인증 방식과 JWT 구조 정리

## 1. 문서 목적

본 문서는 인증 구조에서 자주 등장하는 Stateful 방식과 Stateless 방식의 차이를 설명하고, JWT Access Token / Refresh Token 구조가 실제로는 어떤 방식에 가까운지 정리하기 위한 문서입니다.

본 문서의 목적은 다음과 같습니다.

```text
1. Stateful 인증 방식 설명
2. Stateless 인증 방식 설명
3. 서버 세션 방식과 JWT 방식의 차이 설명
4. JWT가 항상 완전한 Stateless 방식은 아니라는 점 설명
5. Refresh Token 저장소를 사용하는 JWT 구조의 성격 설명
6. 고객사/개발사 확인 시 필요한 기준 정리
```

---

## 2. Stateful 방식이란 무엇인가

Stateful 방식은 서버가 사용자의 로그인 상태를 저장하고 관리하는 방식입니다.

대표적인 예시는 서버 세션 방식입니다.

흐름은 다음과 같습니다.

```text
1. 사용자가 로그인한다.
2. 서버가 사용자 인증에 성공한다.
3. 서버가 세션 저장소에 로그인 상태를 저장한다.
4. 서버가 클라이언트에 세션 ID를 전달한다.
5. 클라이언트는 이후 요청마다 세션 ID를 보낸다.
6. 서버는 세션 저장소에서 세션 ID를 조회한다.
7. 세션이 유효하면 요청을 처리한다.
```

일반적인 전달 방식은 Cookie입니다.

```http
Cookie: JSESSIONID=<session_id>
```

이 방식에서는 서버가 사용자 상태를 계속 기억합니다.

따라서 Stateful이라고 부릅니다.

---

## 3. Stateful 방식의 특징

Stateful 방식의 특징은 다음과 같습니다.

| 항목         | 설명           |
| ---------- | ------------ |
| 상태 저장 위치   | 서버           |
| 클라이언트 보유 값 | 세션 ID        |
| 인증 판단 기준   | 서버 세션 저장소 조회 |
| 로그아웃 처리    | 서버 세션 삭제     |
| 강제 로그아웃    | 서버 세션 삭제로 가능 |
| 다중 서버      | 세션 공유 필요     |
| 확장성        | 세션 저장소 설계 필요 |

장점:

```text
1. 서버가 로그인 상태를 직접 통제하기 쉽다.
2. 로그아웃, 강제 로그아웃 처리가 명확하다.
3. 세션 폐기, 계정 차단 반영이 쉽다.
4. 토큰 탈취 시 서버 측에서 차단하기 쉽다.
```

단점:

```text
1. 서버가 세션 상태를 저장해야 한다.
2. 다중 서버 환경에서는 세션 공유가 필요하다.
3. Redis, DB, Sticky Session 등의 설계가 필요할 수 있다.
4. 서버 저장소 장애가 인증 장애로 이어질 수 있다.
```

---

## 4. Stateless 방식이란 무엇인가

Stateless 방식은 서버가 각 요청의 인증 상태를 서버 세션으로 저장하지 않고, 요청에 포함된 인증 정보를 검증하여 처리하는 방식입니다.

JWT Access Token 방식이 대표적인 예입니다.

흐름은 다음과 같습니다.

```text
1. 사용자가 로그인한다.
2. 서버가 JWT Access Token을 발급한다.
3. 클라이언트는 이후 API 요청마다 Access Token을 보낸다.
4. 서버는 Access Token의 서명과 만료시간을 검증한다.
5. 토큰이 유효하면 요청을 처리한다.
```

예시:

```http
GET /api/user/profile
Authorization: Bearer <access_token>
```

서버는 매 요청마다 세션 저장소를 조회하지 않고, 토큰 자체를 검증해서 인증 여부를 판단할 수 있습니다.

그래서 Stateless라고 부릅니다.

---

## 5. Stateless 방식의 특징

Stateless 방식의 특징은 다음과 같습니다.

| 항목         | 설명                     |
| ---------- | ---------------------- |
| 상태 저장 위치   | 원칙적으로 서버 세션 없음         |
| 클라이언트 보유 값 | Access Token           |
| 인증 판단 기준   | JWT 서명, 만료시간, claim 검증 |
| 로그아웃 처리    | 단순 JWT만으로는 어려움         |
| 강제 로그아웃    | 별도 블랙리스트 또는 저장소 필요     |
| 다중 서버      | 상대적으로 수평 확장 쉬움         |
| 확장성        | 세션 조회 부담 감소            |

장점:

```text
1. 서버 세션 저장소 조회 없이 인증 가능하다.
2. 다중 서버 환경에서 확장성이 좋다.
3. API 서버 간 인증 상태 공유 부담이 줄어든다.
4. 마이크로서비스 구조에서 사용하기 쉽다.
```

단점:

```text
1. 토큰이 만료되기 전까지 서버가 즉시 폐기하기 어렵다.
2. 로그아웃, 강제 로그아웃을 구현하려면 별도 저장소가 필요할 수 있다.
3. 토큰 탈취 시 만료 전까지 악용될 수 있다.
4. Refresh Token을 사용하면 서버 상태 저장이 다시 필요해질 수 있다.
```

---

## 6. JWT는 항상 완전한 Stateless인가

아닙니다.

JWT Access Token만 사용하는 단순 구조는 Stateless에 가깝습니다.

하지만 Refresh Token, 로그아웃, 강제 만료, Token Rotation, 재사용 탐지 등을 구현하면 서버 저장소가 필요해집니다.

즉, 실무 JWT 구조는 다음처럼 혼합형이 되는 경우가 많습니다.

```text
Access Token 검증:
Stateless 성격
→ JWT 서명과 만료시간 검증

Refresh Token 관리:
Stateful 성격
→ DB/Redis/Session Store에 저장하고 대조
```

따라서 다음 표현이 정확합니다.

```text
JWT Access Token 검증은 Stateless하게 처리할 수 있다.
하지만 Refresh Token 관리까지 포함하면 Stateful 요소가 들어갈 수 있다.
```

---

## 7. Refresh Token 저장소를 쓰면 Stateless가 아닌가

Refresh Token을 서버 저장소에 저장한다고 해서 전체 구조가 잘못된 것은 아닙니다.

오히려 운영 환경에서는 Refresh Token을 서버에서 관리하는 것이 일반적으로 더 통제력이 높습니다.

예시:

```text
Access Token:
서버 저장소 조회 없이 서명/만료시간 검증

Refresh Token:
DB/Redis 저장소와 대조
폐기 여부 확인
재사용 여부 확인
새 Access Token 발급
```

이 구조는 완전 Stateless가 아니라 **Hybrid 방식**입니다.

즉, 다음처럼 볼 수 있습니다.

| 영역               | 방식        |
| ---------------- | --------- |
| 일반 API 요청        | Stateless |
| Access Token 검증  | Stateless |
| Refresh Token 검증 | Stateful  |
| 로그아웃/강제만료        | Stateful  |
| Rotation/재사용 탐지  | Stateful  |

---

## 8. 서버에 Refresh Token을 저장하는 이유

Refresh Token을 서버에 저장하는 목적은 다음과 같습니다.

```text
1. 로그아웃 시 Refresh Token 폐기
2. 강제 로그아웃
3. 계정 잠금 또는 탈퇴 반영
4. Refresh Token 탈취 대응
5. Refresh Token Rotation
6. 재사용 탐지
7. 사용자별 세션 관리
8. 비정상 Refresh 빈도 탐지
```

즉, 서버 저장은 잘못이 아닙니다.

문제는 다음 표현입니다.

```text
Refresh Token은 서버에만 있으므로 클라이언트에는 아무것도 없다.
```

이 표현은 구조상 불명확합니다.

Refresh 요청을 하려면 클라이언트가 서버에 어떤 식별값을 보내야 합니다.

예시:

```text
1. Refresh Token Cookie
2. Refresh Token Header
3. Refresh Token Body
4. Session ID Cookie
5. 기타 세션 식별값
```

클라이언트가 아무 값도 보내지 않는데 서버가 어떤 사용자의 Access Token을 재발급해야 하는지 판단하기는 어렵습니다.

---

## 9. Stateful 세션 방식과 Refresh Token 방식의 차이

서버 세션 방식과 Refresh Token 방식은 비슷해 보일 수 있지만, 구분이 필요합니다.

### 9.1 서버 세션 방식

```text
클라이언트:
Session ID Cookie 보유

서버:
Session ID 기준으로 로그인 상태 조회
```

예시:

```http
Cookie: JSESSIONID=<session_id>
```

이 경우 클라이언트가 가진 것은 Refresh Token이 아니라 세션 ID입니다.

---

### 9.2 Refresh Token 방식

```text
클라이언트:
Refresh Token 또는 Refresh Token Cookie 보유

서버:
Refresh Token 또는 jti/hash를 저장소와 대조
```

예시:

```http
Cookie: refresh_token=<refresh_token>
```

또는:

```json
{
  "refreshToken": "<refresh_token>"
}
```

---

### 9.3 공통점

두 방식 모두 클라이언트가 서버에 식별값을 보냅니다.

```text
서버 세션 방식:
Session ID를 보냄

Refresh Token 방식:
Refresh Token 또는 Refresh Token 식별값을 보냄
```

따라서 “클라이언트에는 아무것도 없다”는 설명은 둘 중 어느 방식에서도 부정확할 수 있습니다.

---

## 10. Stateful / Stateless 관점에서 본 현재 확인 포인트

현재 JWT 갱신 구조를 확인할 때 중요한 질문은 다음입니다.

```text
1. 일반 API 요청은 Access Token으로 인증하는가?
2. 서버는 일반 API 요청마다 세션 저장소를 조회하는가?
3. Refresh 요청 시 클라이언트가 보내는 값은 무엇인가?
4. 그 값은 Cookie, Header, Body 중 어디에 있는가?
5. Refresh Token 또는 세션 식별값이 서버 저장소와 대조되는가?
6. 만료된 Access Token만으로 새 Access Token이 발급되는가?
7. 로그아웃 시 서버 저장소의 Refresh Token 또는 세션이 폐기되는가?
8. 강제 로그아웃 시 재발급이 차단되는가?
```

이 질문에 답해야 현재 구조가 다음 중 어디에 가까운지 판단할 수 있습니다.

```text
1. 순수 Stateless JWT
2. 서버 세션 Stateful
3. JWT Access Token + Refresh Token 저장소 Hybrid
4. 만료 Access Token 기반 재발급 구조
```

---

## 11. 각 방식별 정상 흐름 비교

| 구분               | 클라이언트가 보내는 값                 | 서버 검증 방식                     | 특징           |
| ---------------- | ---------------------------- | ---------------------------- | ------------ |
| 서버 세션 Stateful   | Session ID Cookie            | Session Store 조회             | 서버가 상태 관리    |
| 순수 JWT Stateless | Access Token                 | JWT 서명/만료 검증                 | 서버 저장소 조회 없음 |
| Hybrid JWT       | Access Token + Refresh Token | API는 JWT 검증, Refresh는 저장소 대조 | 실무에서 자주 사용   |
| 불명확한 구조          | 만료 Access Token              | 검증 기준 불명확                    | 점검 필요        |

---

## 12. 성능 관점 차이

### 12.1 Stateful 방식

Stateful 방식은 매 요청마다 세션 저장소를 조회할 수 있습니다.

성능 영향:

```text
1. 세션 저장소 부하 발생
2. Redis/DB 응답시간 영향
3. 다중 서버 세션 공유 필요
4. 세션 저장소 장애 시 인증 장애 가능
```

장점:

```text
1. 로그아웃/강제만료 통제 쉬움
2. 서버 측에서 즉시 세션 폐기 가능
```

---

### 12.2 Stateless 방식

Stateless 방식은 Access Token 자체 검증으로 인증을 처리할 수 있습니다.

성능 영향:

```text
1. 세션 저장소 조회 부담 감소
2. 수평 확장에 유리
3. 매 요청마다 JWT 서명 검증 비용 발생
```

장점:

```text
1. API 서버 확장 용이
2. 중앙 세션 저장소 의존도 감소
```

단점:

```text
1. 토큰 만료 전 강제 폐기 어려움
2. 블랙리스트를 쓰면 다시 저장소 조회가 필요할 수 있음
```

---

### 12.3 Hybrid 방식

Hybrid 방식은 일반 API 요청은 Stateless하게 처리하고, Refresh나 로그아웃은 Stateful하게 처리합니다.

성능 영향:

```text
1. 일반 API는 저장소 조회 없이 처리 가능
2. Refresh 시점에만 DB/Redis 조회
3. Refresh 중복 발생 시 저장소 부하 급증 가능
4. 동시 401 상황에서 single-flight 처리가 중요
```

이 방식에서 특히 중요한 것은 다음입니다.

```text
API 요청 수가 많아도 Refresh 요청은 사용자 세션 기준 1회로 제한해야 한다.
```

---

## 13. 보안 관점 차이

### 13.1 Stateful 방식

보안상 장점:

```text
1. 서버가 세션을 즉시 폐기 가능
2. 강제 로그아웃이 명확함
3. 계정 상태 변경을 즉시 반영하기 쉬움
```

주의점:

```text
1. 세션 ID 탈취 방지 필요
2. Cookie 보안 속성 필요
3. CSRF 방어 필요
```

---

### 13.2 Stateless 방식

보안상 장점:

```text
1. 서버 세션 탈취 위험 감소
2. 짧은 만료시간으로 토큰 탈취 영향 제한 가능
```

주의점:

```text
1. 만료 전 Access Token 폐기가 어려움
2. 탈취된 Access Token은 만료 전까지 유효할 수 있음
3. 민감정보를 JWT Payload에 넣으면 안 됨
```

---

### 13.3 Hybrid 방식

보안상 장점:

```text
1. Access Token은 짧게 유지
2. Refresh Token은 서버 저장소로 통제
3. 로그아웃/강제만료/Rotation 구현 가능
```

주의점:

```text
1. Refresh Token 저장소 보안 필요
2. Refresh Token 탈취 대응 필요
3. 재사용 탐지 필요
4. Refresh 요청 중복 방지 필요
```

---

## 14. 고객사 설명용 핵심 문장

고객사 또는 개발사에 설명할 때는 다음 문장을 사용할 수 있습니다.

```text
JWT는 무조건 서버에 아무 상태도 저장하지 않는 구조가 아닙니다.

Access Token 검증은 Stateless하게 처리할 수 있지만,
Refresh Token을 사용하는 경우 로그아웃, 강제만료, 재사용 탐지, Token Rotation을 위해 서버 저장소를 사용할 수 있습니다.

따라서 Refresh Token이 서버에 저장된다는 말 자체는 문제가 아닙니다.

다만 Refresh 요청 시 클라이언트가 서버에 어떤 값을 전달하는지,
그리고 서버가 그 값을 어떤 저장소와 대조하여 새 Access Token을 발급하는지가 명확해야 합니다.

클라이언트가 아무 값도 제시하지 않거나,
만료된 Access Token만으로 새 Access Token이 발급된다면 구조 점검이 필요합니다.
```

---

## 15. 잘못된 오해 정리

### 오해 1. JWT는 무조건 Stateless다

정확한 설명:

```text
Access Token 검증은 Stateless하게 할 수 있다.
그러나 Refresh Token 관리, 로그아웃, 강제만료를 구현하면 Stateful 요소가 들어간다.
```

---

### 오해 2. Refresh Token은 서버에만 있으면 된다

정확한 설명:

```text
서버에 저장할 수는 있다.
하지만 클라이언트도 Refresh 요청 시 서버가 식별할 수 있는 값을 보내야 한다.
그 값은 Refresh Token Cookie, Session ID, Header, Body 등일 수 있다.
```

---

### 오해 3. 만료된 Access Token을 Refresh에 넣으면 된다

정확한 설명:

```text
Access Token은 API 접근용이다.
Refresh Token은 재발급용이다.
만료된 Access Token만으로 새 Access Token이 발급되면 역할 분리가 약해진다.

단, 만료 Access Token은 subject 추출용으로만 쓰고
실제 재발급 권한을 서버 세션/Redis/DB로 검증한다면 별도 설명이 필요하다.
```

---

### 오해 4. 요청이 여러 개면 Refresh도 여러 번 가는 게 당연하다

정확한 설명:

```text
요청이 여러 개 발생하는 것은 정상일 수 있다.
하지만 Access Token 만료 시 Refresh는 공통 제어 로직에서 1회로 제한해야 한다.
동시에 실패한 요청은 대기 후 새 Access Token으로 재시도해야 한다.
```

---

## 16. 결론

Stateful, Stateless, Hybrid 방식을 구분하면 JWT 구조를 더 정확히 설명할 수 있습니다.

정리하면 다음과 같습니다.

```text
Stateful:
서버가 로그인 상태를 저장하고 관리한다.

Stateless:
요청에 포함된 토큰 자체를 검증해서 인증한다.

Hybrid JWT:
일반 API 요청은 Access Token으로 Stateless하게 처리하고,
Refresh Token, 로그아웃, 강제만료는 서버 저장소로 Stateful하게 관리한다.
```

실무에서 Access Token과 Refresh Token을 함께 사용하는 구조는 완전 Stateless라기보다 Hybrid 방식에 가까운 경우가 많습니다.

따라서 확인해야 할 핵심은 다음입니다.

```text
1. Access Token은 무엇에 쓰이는가?
2. Refresh Token은 실제로 존재하는가?
3. Refresh 요청 시 클라이언트는 무엇을 보내는가?
4. 서버는 그 값을 어디와 대조하는가?
5. 만료된 Access Token만으로 재발급되는가?
6. 동시 인증 실패 시 Refresh 요청은 1회로 제어되는가?
```
