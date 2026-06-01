# 시퀀스 다이어그램 목록

## 1. 문서 목적

본 문서는 JWT Refresh Single-Flight PoC와 관련된 PlantUML 시퀀스 다이어그램 목록을 정리하기 위한 문서입니다.

다이어그램의 목적은 다음과 같습니다.

```text
1. JWT 정상 인증 흐름 시각화
2. Access Token 만료 후 Refresh 흐름 시각화
3. Refresh 요청 중복 발생 문제 시각화
4. Refresh 1회 처리만으로는 부족한 상황 설명
5. Refresh Single-Flight + Failed Queue 개선 구조 설명
6. Embedded Resource 및 다중 요청 상황 설명
7. Stateful / Stateless / Hybrid 인증 방식 비교
```

---

## 2. 다이어그램 파일 목록

| 번호  | 파일명                                               | 제목                                          | 목적                                                                   |
| --- | ------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------- |
| D01 | `D01_jwt_normal_flow.puml`                        | JWT 정상 로그인 및 API 요청 흐름                      | 로그인 후 유효한 Access Token으로 보호 API를 호출하는 정상 흐름 설명                       |
| D02 | `D02_jwt_access_expired_single_request.puml`      | Access Token 만료 후 단일 요청 Refresh 흐름          | 단일 API 요청이 401을 받고 Refresh 후 재시도되는 흐름 설명                             |
| D03 | `D03_jwt_problem_refresh_duplicated.puml`         | 비정상: Refresh 요청 중복 발생                       | API 8개 실패 시 Refresh 요청도 8회 발생하는 문제 설명                                |
| D04 | `D04_jwt_problem_only_one_retry.puml`             | 비정상: Refresh 1회이나 일부 요청만 복구                 | Refresh는 1회이나 최초 요청만 재시도되고 나머지가 실패하는 흐름 설명                           |
| D05 | `D05_jwt_single_flight_flow.puml`                 | 정상 개선: Refresh Single-Flight + Failed Queue | Refresh 1회 + 실패 요청 대기 + 새 토큰으로 전체 재시도 흐름 설명                          |
| D06 | `D06_jwt_embedded_resource_handling.puml`         | Embedded Resource 및 다중 요청 처리 기준             | 정적 리소스와 보호 API 요청을 분리하고 Refresh를 단일화하는 흐름 설명                         |
| D07 | `D07_jwt_refresh_with_access_token_rejected.puml` | Access Token으로 Refresh 시도 시 거부              | Access Token을 Refresh API에 넣었을 때 거부되어야 하는 흐름 설명                      |
| D08 | `D08_jwt_refresh_failure_queue_cleanup.puml`      | Refresh 실패 시 대기열 정리                         | Refresh 실패 시 failedQueue와 토큰을 정리하는 흐름 설명                             |
| D09 | `D09_stateful_session_flow.puml`                  | Stateful 세션 인증 흐름                           | 서버 세션 기반 Stateful 인증 흐름 설명                                           |
| D10 | `D10_stateless_jwt_flow.puml`                     | Stateless JWT 인증 흐름                         | Access Token 자체 검증 기반 Stateless 인증 흐름 설명                             |
| D11 | `D11_hybrid_jwt_refresh_flow.puml`                | Hybrid JWT + Refresh Token 흐름               | Access Token은 Stateless, Refresh Token은 Stateful하게 관리하는 Hybrid 구조 설명 |

---

## 3. 권장 참조 순서

### 3.1 JWT 기본 흐름 설명

```text
D01_jwt_normal_flow.puml
→ D02_jwt_access_expired_single_request.puml
```

사용 목적:

```text
로그인 후 Access Token으로 API를 호출하고,
Access Token 만료 시 Refresh Token으로 새 Access Token을 발급받는 기본 흐름 설명
```

---

### 3.2 현재 문제 상황 설명

```text
D03_jwt_problem_refresh_duplicated.puml
→ D04_jwt_problem_only_one_retry.puml
```

사용 목적:

```text
1. 실패 요청 수만큼 Refresh가 중복 발생하는 문제 설명
2. Refresh를 1회로 줄였지만 나머지 요청이 복구되지 않는 문제 설명
```

---

### 3.3 개선 방향 설명

```text
D05_jwt_single_flight_flow.puml
→ D08_jwt_refresh_failure_queue_cleanup.puml
```

사용 목적:

```text
1. Refresh 요청을 1회로 제한
2. 실패 요청을 failedQueue에 대기
3. 새 Access Token 발급 후 전체 재시도
4. Refresh 실패 시 대기열 정리
```

---

### 3.4 Embedded Resource 및 다중 요청 설명

```text
D06_jwt_embedded_resource_handling.puml
```

사용 목적:

```text
화면 진입 시 정적 리소스, 보호 API, 업무 API가 함께 발생할 수 있으나,
요청 수 증가가 Refresh 요청 중복을 정당화하지 않는다는 점 설명
```

---

### 3.5 Stateful / Stateless / Hybrid 설명

```text
D09_stateful_session_flow.puml
→ D10_stateless_jwt_flow.puml
→ D11_hybrid_jwt_refresh_flow.puml
```

사용 목적:

```text
1. 서버 세션 기반 Stateful 인증 설명
2. JWT Access Token 기반 Stateless 인증 설명
3. Access Token + Refresh Token 저장소를 사용하는 Hybrid 구조 설명
```

---

## 4. 보고서/PPT 참조 방식

보고서 또는 PPT에서는 다음과 같이 참조할 수 있습니다.

```text
[D03] 비정상 흐름: Refresh 요청 중복 발생
[D05] 정상 개선 흐름: Refresh Single-Flight + Failed Queue
[D11] Hybrid JWT + Refresh Token 구조
```

예시 문장:

```text
현재 관찰된 현상은 [D03]과 같이 Access Token 만료 시 실패 요청 수만큼 Refresh 요청이 중복 발생할 가능성이 있는 구조입니다.

정상 개선 방향은 [D05]와 같이 Refresh 요청을 1회로 제한하고, 동시에 실패한 요청은 대기열에 보관한 뒤 새 Access Token으로 재시도하는 방식입니다.
```

---

## 5. 다이어그램 관리 규칙

다이어그램 파일명은 다음 규칙을 따릅니다.

```text
D번호_설명.puml
```

예시:

```text
D01_jwt_normal_flow.puml
D05_jwt_single_flight_flow.puml
D11_hybrid_jwt_refresh_flow.puml
```

관리 기준:

```text
1. 번호는 문서에서 참조하기 쉽게 고정한다.
2. 기존 번호의 의미를 바꾸지 않는다.
3. 새 다이어그램은 마지막 번호 뒤에 추가한다.
4. 보고서/PPT에서는 번호와 제목을 함께 표기한다.
5. 다이어그램 수정 시 관련 문서의 참조 번호도 함께 확인한다.
```

---

## 6. 최종 정리

다이어그램은 본 문서 세트에서 다음 역할을 합니다.

```text
1. 기술 흐름을 비전문가도 이해할 수 있게 시각화한다.
2. 말로 설명하기 어려운 Refresh 중복 문제를 요청 순서로 보여준다.
3. 정상 흐름과 비정상 흐름을 비교할 수 있게 한다.
4. 고객사/개발사와 논점을 요청/응답 흐름 기준으로 정리한다.
5. 성능시험 전 인증 갱신 구조 확인 기준을 제공한다.
```
