# Embedded Resource 및 다중 요청 실패 대처방안

## 1. 문서 목적

본 문서는 화면 흐름을 단순화하기 위해 요청을 하나의 흐름으로 처리하려 했으나, Embedded Resource 또는 하위 요청 처리 과정에서 일부 요청이 실패하여 성능시험 또는 시나리오 구성이 막히는 상황에 대한 대처방안을 정리하기 위한 문서입니다.

본 문서에서 다루는 핵심은 다음과 같습니다.

```text
1. 화면 진입 시 요청이 여러 개 발생하는 이유
2. Embedded Resource 요청과 API 요청의 구분
3. Access Token 만료 시 다중 요청 실패가 발생하는 구조
4. Refresh 요청을 단순히 1회로 줄였을 때 일부 요청이 실패하는 이유
5. JMeter 또는 브라우저 기반 성능시험에서의 대처방안
6. 고객사/개발사에 확인해야 할 사항
7. 정상적인 개선 방향
```

---

## 2. 상황 요약

현재 관찰 또는 우려되는 상황은 다음과 같이 정리할 수 있습니다.

```text
1. 화면 또는 메뉴 하나를 열면 여러 요청이 발생한다.
2. 요청 흐름을 단순화하기 위해 하나의 대표 요청 또는 하나의 토큰 처리 흐름으로 묶으려 했다.
3. 그러나 하위 요청, Embedded Resource, 또는 추가 API 요청 일부가 인증 실패로 떨어졌다.
4. Refresh 요청을 1회만 수행하도록 처리했을 때 최초 요청은 정상 처리되지만, 나머지 요청은 실패하는 문제가 발생할 수 있다.
5. 이로 인해 성능시험 스크립트 작성 또는 실제 사용자 흐름 재현이 막힌다.
```

이 상황의 핵심은 다음입니다.

```text
요청을 하나로 줄이는 것이 목적이 아니라,
인증 실패 후 복구 흐름을 공통으로 제어하는 것이 목적이다.
```

---

## 3. 요청 유형 구분

화면 하나를 열 때 발생하는 요청은 모두 같은 성격이 아닙니다.

다음과 같이 구분해야 합니다.

| 요청 유형      | 예시                                     | 인증 필요 여부  | 처리 기준                        |
| ---------- | -------------------------------------- | --------- | ---------------------------- |
| HTML 문서 요청 | `/main`, `/dashboard`                  | 환경에 따라 다름 | 화면 진입 기준 요청                  |
| 정적 리소스     | `.js`, `.css`, `.png`, `.woff2`        | 보통 불필요    | 인증 대상에서 제외 권장                |
| 보호 리소스     | 첨부파일, 사용자별 이미지                         | 필요할 수 있음  | Access Token 또는 Cookie 정책 필요 |
| 업무 API     | `/api/user`, `/api/menu`, `/api/list`  | 보통 필요     | Access Token 검증 대상           |
| 인증 API     | `/api/auth/login`, `/api/auth/refresh` | 별도 처리     | Refresh 자동 재시도 대상에서 제외       |
| Preflight  | `OPTIONS`                              | 불필요       | 인증 필터 제외 권장                  |

요청이 여러 개 발생한다고 해서 모두 JWT Refresh 대상이 되어야 하는 것은 아닙니다.

---

## 4. Embedded Resource란 무엇인가

Embedded Resource는 HTML 응답 또는 화면 렌더링 과정에서 함께 로드되는 하위 리소스를 의미합니다.

예시:

```text
<script src="/static/app.js">
<link rel="stylesheet" href="/static/style.css">
<img src="/images/logo.png">
<link rel="font" href="/fonts/main.woff2">
<iframe src="/some-frame">
```

JMeter에서 `Retrieve All Embedded Resources` 옵션을 사용하면, HTML 응답 안의 하위 리소스를 자동으로 따라가며 요청할 수 있습니다.

이 기능은 브라우저와 유사하게 리소스를 로드하기 위한 용도입니다.

그러나 이 옵션은 JWT Refresh 구조를 해결해주지 않습니다.

---

## 5. Embedded Resource와 JWT Refresh 문제의 구분

다음 두 문제는 분리해서 봐야 합니다.

| 구분                    | 설명                                                      |
| --------------------- | ------------------------------------------------------- |
| 요청이 여러 개 발생하는 문제      | 화면 구조, Embedded Resource, API 분리, 브라우저 동작, JMeter 옵션 영향 |
| Refresh가 여러 번 발생하는 문제 | Access Token 만료 시 인증 갱신 로직이 요청별로 따로 실행되는 문제             |

즉, Embedded Resource는 요청 수 증가의 원인이 될 수 있습니다.

하지만 다음 결론은 성립하지 않습니다.

```text
Embedded Resource 때문에 요청이 8개 발생한다.
따라서 Refresh 요청도 8번 발생해도 정상이다.
```

정상적인 결론은 다음입니다.

```text
Embedded Resource 또는 API 요청이 여러 개 발생할 수 있다.
그러나 Access Token 만료 시 Refresh 요청은 공통 제어 지점에서 1회로 제한되어야 한다.
인증 실패한 요청들은 새 Access Token 발급 후 재시도되어야 한다.
```

---

## 6. 잘못된 대처: 요청을 무조건 하나로 줄이기

문제를 단순화하기 위해 요청을 하나로 줄이는 접근은 임시 우회로는 가능하지만, 실제 사용자 흐름 검증에는 한계가 있습니다.

예시:

```text
원래 화면:
GET /api/menu
GET /api/user
GET /api/permission
GET /api/dashboard
GET /api/notice
GET /api/code
GET /api/config
GET /api/list

단순화:
GET /api/dashboard-summary 하나만 호출
```

이 방식의 문제는 다음과 같습니다.

```text
1. 실제 사용자 화면 흐름과 다르다.
2. 인증 만료 시 동시 실패 상황을 검증하지 못한다.
3. Embedded Resource 또는 하위 API 실패를 숨긴다.
4. 성능시험 결과가 실제 사용자 체감과 달라질 수 있다.
5. 일부 병목 또는 오류가 테스트에서 제외된다.
```

따라서 요청을 하나로 줄이는 방식은 원인 분석 또는 임시 확인용으로만 사용해야 합니다.

---

## 7. 잘못된 대처: 장기 유효 Access Token 사용

성능시험 진행을 위해 1주일 또는 장기 유효 Access Token을 발급하여 Authorization Header에 넣는 방식은 테스트를 쉽게 만들 수 있습니다.

하지만 이 방식은 다음 문제를 가집니다.

```text
1. Access Token 만료 상황을 우회한다.
2. Refresh 구조를 검증하지 못한다.
3. 실제 사용자 인증 흐름을 재현하지 못한다.
4. 토큰 만료 시 오류율 증가 여부를 확인할 수 없다.
5. Refresh 중복으로 인한 인증 서버 부하를 측정하지 못한다.
```

장기 토큰은 제한적으로 다음 목적에는 사용할 수 있습니다.

```text
1. 업무 API 자체의 처리 성능만 분리 측정
2. 인증 갱신 이슈와 업무 API 성능을 분리해서 분석
3. 성능시험 환경이 불안정할 때 임시 우회
```

그러나 장기 토큰을 사용하더라도 실제 운영 인증 흐름 검증은 별도 수행해야 합니다.

---

## 8. 실패 원인 분류

Embedded Resource 또는 하위 요청 실패가 발생할 경우 다음 기준으로 원인을 분류합니다.

### 8.1 인증 실패

```text
HTTP 401 Unauthorized
Access Token 만료
Authorization Header 누락
Refresh 실패
Cookie 미전송
```

대처:

```text
1. Access Token 유효성 확인
2. Authorization Header 포함 여부 확인
3. Refresh 요청 발생 여부 확인
4. Refresh 성공 후 재시도 여부 확인
5. Cookie 기반이면 credentials 설정 확인
```

---

### 8.2 권한 실패

```text
HTTP 403 Forbidden
권한 부족
역할/그룹 권한 누락
보호 리소스 접근 제한
```

대처:

```text
1. 해당 리소스가 인증 대상인지 확인
2. 해당 계정에 접근 권한이 있는지 확인
3. Access Token claim에 권한 정보가 포함되는지 확인
4. 서버 권한 매핑 확인
```

---

### 8.3 CORS / Preflight 실패

```text
OPTIONS 실패
Access-Control-Allow-Origin 누락
Access-Control-Allow-Headers 누락
Access-Control-Allow-Credentials 누락
Authorization Header 미허용
```

대처:

```text
1. OPTIONS 요청 인증 제외
2. Authorization Header 허용
3. Content-Type Header 허용
4. Cookie 사용 시 credentials 허용
5. Origin 정확히 지정
```

---

### 8.4 정적 리소스 실패

```text
JS/CSS/Image/Font 404
정적 리소스 경로 오류
JMeter base URL 처리 오류
상대경로 해석 오류
```

대처:

```text
1. 정적 리소스가 성능시험 대상인지 판단
2. 필요 없는 정적 리소스는 제외
3. 필요한 리소스는 경로 보정
4. 캐시 대상 리소스는 별도 처리
5. API 성능시험과 정적 리소스 성능시험을 분리
```

---

### 8.5 JMeter Embedded Resource 옵션 영향

JMeter가 HTML 응답의 하위 리소스를 자동으로 따라가면서 예상보다 많은 요청이 발생할 수 있습니다.

대처:

```text
1. Retrieve All Embedded Resources 옵션 사용 여부 확인
2. URLs must match 필터 설정
3. 정적 리소스 포함 여부 결정
4. API 성능시험과 브라우저 유사 성능시험을 분리
5. Embedded Resource 실패가 업무 API 실패인지 구분
```

---

## 9. JMeter 기준 대처방안

JMeter에서 Embedded Resource 또는 하위 요청 때문에 실패가 발생하는 경우 다음 순서로 처리합니다.

### 9.1 1단계: 요청 분류

Network 또는 JMeter 결과를 기준으로 요청을 분류합니다.

```text
1. 업무 API
2. 인증 API
3. Refresh API
4. 정적 리소스
5. 이미지/폰트
6. OPTIONS
7. 외부 도메인 요청
```

각 요청이 성능시험 대상인지 결정합니다.

---

### 9.2 2단계: 정적 리소스 포함 여부 결정

API 성능시험이 목적이면 정적 리소스는 제외할 수 있습니다.

```text
제외 후보:
.js
.css
.png
.jpg
.svg
.ico
.woff
.woff2
.map
```

브라우저 체감 성능시험이 목적이면 포함할 수 있습니다.

단, 포함하는 경우에도 인증 실패와 정적 리소스 실패를 구분해야 합니다.

---

### 9.3 3단계: Refresh 흐름 별도 구현

JMeter에서는 브라우저의 Axios Interceptor가 자동으로 동작하지 않습니다.

따라서 JMeter 스크립트에서는 다음을 별도로 구현해야 합니다.

```text
1. Access Token 추출
2. Refresh Token 추출
3. 401 응답 감지
4. Refresh 요청 수행
5. 새 Access Token 저장
6. 실패 요청 재시도
```

단, JMeter에서 실제 프론트엔드의 single-flight queue까지 완전히 동일하게 재현하는 것은 복잡합니다.

성능시험 목적에 따라 다음 중 하나를 선택합니다.

| 방식            | 목적              | 특징              |
| ------------- | --------------- | --------------- |
| 실제 인증 흐름 재현   | 사용자 흐름 검증       | 복잡하지만 현실적       |
| 장기 토큰 사용      | 업무 API 성능 분리 측정 | 인증 갱신 흐름 우회     |
| 토큰 사전 발급 CSV  | 다계정 성능시험        | 토큰 만료 처리 별도 필요  |
| 브라우저 기반 도구 사용 | 실제 프론트 동작 검증    | JMeter 단독보다 현실적 |

---

### 9.4 4단계: 인증 실패와 업무 실패 분리

성능시험 결과에서 다음을 분리해서 봅니다.

```text
1. 업무 API 실패
2. 인증 만료 실패
3. Refresh 실패
4. CORS/OPTIONS 실패
5. 정적 리소스 실패
6. 외부 리소스 실패
```

이 분리가 없으면 오류율의 원인을 잘못 해석할 수 있습니다.

---

## 10. 실제 사용자 흐름 기준 대처방안

실제 브라우저 사용자를 기준으로는 프론트엔드 공통 API 클라이언트에서 처리해야 합니다.

권장 구조:

```text
1. API 요청 시 Access Token 삽입
2. 401 응답 감지
3. isRefreshing 확인
4. 최초 요청만 Refresh 수행
5. 후속 실패 요청은 failedQueue 등록
6. Refresh 성공 시 새 Access Token 저장
7. failedQueue 요청 재시도
8. Refresh 실패 시 전체 요청 실패 처리 및 로그인 이동
```

이 구조를 적용하면 Embedded Resource 또는 API 요청이 여러 개 있더라도 Refresh 요청 중복을 줄일 수 있습니다.

단, 정적 리소스 요청은 일반적으로 Axios Interceptor 대상이 아닐 수 있습니다.

따라서 보호 리소스와 정적 리소스를 분리해야 합니다.

---

## 11. 보호 리소스와 정적 리소스 분리 기준

정적 리소스는 가능하면 인증 대상에서 제외하는 것이 일반적으로 단순합니다.

예시:

```text
/static/**
/assets/**
/images/public/**
/favicon.ico
```

인증이 필요한 보호 리소스는 별도 경로로 분리합니다.

예시:

```text
/api/files/**
/api/private-images/**
/api/attachments/**
```

분리 기준:

| 리소스         | 권장 처리 |
| ----------- | ----- |
| 공개 JS/CSS   | 인증 제외 |
| 공개 이미지      | 인증 제외 |
| 사용자별 첨부파일   | 인증 필요 |
| 개인정보 포함 파일  | 인증 필요 |
| 권한별 다운로드 파일 | 인증 필요 |
| 화면 구성 API   | 인증 필요 |

이렇게 분리하지 않으면 모든 하위 리소스가 JWT 인증 실패와 Refresh 흐름에 섞일 수 있습니다.

---

## 12. Refresh 대상 제외 URL

Refresh 자동 처리 대상에서 반드시 제외해야 하는 URL이 있습니다.

```text
/api/auth/login
/api/auth/refresh
/api/auth/logout
OPTIONS /**
정적 리소스 경로
```

이유:

```text
1. Refresh API가 다시 Refresh를 호출하는 무한 루프 방지
2. 로그인 실패를 Refresh로 처리하는 오류 방지
3. 로그아웃 요청이 Refresh로 복구되는 오류 방지
4. OPTIONS 요청이 인증 실패로 처리되는 문제 방지
5. 정적 리소스 실패가 인증 흐름을 오염시키는 문제 방지
```

---

## 13. 고객사/개발사 확인 요청 사항

Embedded Resource 또는 다중 요청 실패와 관련하여 다음 사항을 확인해야 합니다.

```text
1. 화면 진입 시 발생하는 전체 요청 목록
2. 각 요청의 역할
   - 업무 API
   - 인증 API
   - 정적 리소스
   - 보호 리소스
   - OPTIONS
3. 각 요청의 인증 필요 여부
4. Access Token 만료 시 각 요청의 응답 코드
5. Refresh 요청 발생 횟수
6. Refresh 성공 후 기존 실패 요청 재시도 여부
7. 정적 리소스가 인증 필터 대상인지 여부
8. OPTIONS 요청이 인증 필터 대상인지 여부
9. JMeter에서 Embedded Resource 자동 수집 옵션 사용 여부
10. 성능시험 목적이 API 성능인지 브라우저 체감 성능인지
```

---

## 14. 권장 개선 방향

권장 개선 방향은 다음과 같습니다.

```text
1. 요청을 업무 API, 인증 API, 정적 리소스, 보호 리소스로 분류한다.
2. 정적 리소스는 가능하면 인증 대상에서 제외한다.
3. 보호 리소스는 API와 동일하게 명확한 인증 정책을 적용한다.
4. OPTIONS 요청은 인증 필터에서 제외한다.
5. Refresh API는 자동 Refresh 대상에서 제외한다.
6. Access Token 만료 시 Refresh 요청은 1회로 제한한다.
7. 실패 요청은 대기열에 보관한다.
8. 새 Access Token 발급 후 기존 실패 요청을 재시도한다.
9. Refresh 실패 시 대기열을 정리하고 세션 만료 처리한다.
10. JMeter에서는 API 성능시험과 Embedded Resource 포함 시험을 분리한다.
```

---

## 15. 성능시험 설계 기준

성능시험은 목적에 따라 구분해야 합니다.

### 15.1 업무 API 성능시험

목적:

```text
업무 API 처리 성능 측정
```

권장:

```text
1. 정적 리소스 제외
2. Embedded Resource 자동 수집 비활성화 또는 필터링
3. 인증 토큰은 사전 발급 또는 안정적 갱신 처리
4. 업무 API 응답시간/TPS/오류율 중심 측정
```

---

### 15.2 실제 사용자 흐름 성능시험

목적:

```text
사용자 화면 체감 흐름 측정
```

권장:

```text
1. 실제 브라우저 Network 기준 요청 목록 수집
2. API와 정적 리소스 요청 모두 고려
3. 인증 만료/Refresh 흐름 포함
4. 토큰 만료 시점의 오류율과 지연 별도 분석
5. 프론트엔드 single-flight 동작 여부 확인
```

---

### 15.3 인증 구조 검증 시험

목적:

```text
Access Token 만료 및 Refresh 처리 정상성 검증
```

권장:

```text
1. Access Token 만료시간을 짧게 설정
2. API 여러 개 동시 호출
3. Refresh 요청 횟수 확인
4. 실패 요청 재시도 여부 확인
5. Access Token으로 Refresh 시도 시 거부 여부 확인
6. 로그아웃 후 Refresh 거부 여부 확인
```

---

## 16. 공식 설명 문구

고객사 또는 개발사에 설명할 때는 다음 문구를 사용할 수 있습니다.

```text
화면 진입 시 여러 API 또는 Embedded Resource 요청이 발생하는 것은 일반적인 웹 구조일 수 있습니다.

다만 본 이슈의 핵심은 요청 수 자체가 아니라, Access Token 만료 시 여러 요청이 인증 실패했을 때 Refresh 요청이 어떻게 처리되는지입니다.

요청이 여러 개 발생하더라도 Refresh 요청은 공통 제어 로직에서 1회로 제한되어야 하며, 동시에 실패한 요청들은 대기 후 새 Access Token으로 재시도되어야 합니다.

또한 정적 리소스, 보호 리소스, 업무 API, 인증 API, OPTIONS 요청은 각각 인증 필요 여부와 처리 정책을 분리해야 합니다.

Embedded Resource로 인해 요청 수가 증가하는 것은 Refresh 요청 중복 발생을 정당화하는 근거가 될 수 없습니다.
```

---

## 17. 결론

Embedded Resource 또는 다중 API 요청으로 인해 요청 수가 늘어나는 것은 정상일 수 있습니다.

그러나 다음은 별도 문제입니다.

```text
Access Token 만료
→ 여러 요청 인증 실패
→ 실패 요청 수만큼 Refresh 요청 발생
```

정상적인 개선 방향은 다음입니다.

```text
요청 유형 분류
+ 인증 대상 분리
+ Refresh 대상 URL 제외
+ Refresh 요청 단일화
+ 실패 요청 대기열 처리
+ 새 Access Token 발급 후 재시도
+ 성능시험 목적별 요청 범위 분리
```

따라서 요청을 하나로 줄이는 방식은 임시 우회일 수는 있으나, 실제 사용자 흐름과 인증 갱신 구조의 정상성을 검증하기에는 부족합니다.

성능시험 전에는 실제 사용자 흐름 기준의 요청 목록, 인증 대상 여부, Refresh 요청 횟수, 실패 요청 재시도 여부를 Network 로그 기준으로 확인해야 합니다.
