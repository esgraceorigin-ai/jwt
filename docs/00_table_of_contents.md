# JWT Refresh Single-Flight PoC 문서 목차

## 1. 문서 목적

본 문서 세트는 JWT 기반 인증 구조에서 Access Token 만료 시 발생할 수 있는 Refresh 중복 요청, 실패 요청 재시도 누락, Embedded Resource 처리 혼선, Stateful/Stateless 인증 방식 오해, 성능시험 결과 왜곡 가능성을 설명하기 위한 자료입니다.

본 문서 세트의 목적은 다음과 같습니다.

```text
1. JWT Access Token / Refresh Token의 역할을 명확히 구분한다.
2. Stateful / Stateless / Hybrid 인증 구조를 구분한다.
3. Access Token 만료 시 정상적인 Refresh 흐름을 정의한다.
4. 여러 API 요청이 동시에 인증 실패했을 때 Refresh 요청을 어떻게 제어해야 하는지 설명한다.
5. Embedded Resource 또는 다중 요청 상황에서 인증 실패가 발생할 때의 대처방안을 정리한다.
6. 성능시험 전 인증 갱신 구조를 검증하기 위한 기준을 제공한다.
7. 고객사/개발사에 확인해야 할 질문과 증적 요청 항목을 정리한다.
8. PoC 구현 구조와 시연 절차를 문서화한다.
9. PlantUML 시퀀스 다이어그램으로 정상/비정상 흐름을 시각화한다.
```

---

## 2. 핵심 메시지

본 문서 세트의 핵심 메시지는 다음과 같습니다.

```text
API 요청이 여러 개 발생하는 것은 정상일 수 있다.
그러나 Access Token 만료 시 Refresh 요청이 실패 요청 수만큼 발생하는 것은 점검 대상이다.

정상 구조에서는 Refresh 요청은 1회만 수행되어야 하며,
동시에 실패한 요청들은 대기 후 새 Access Token으로 재시도되어야 한다.
```

또한 다음 사항이 중요합니다.

```text
Access Token은 API 접근권이다.
Refresh Token은 Access Token 재발급권이다.

Access Token과 Refresh Token의 역할은 분리되어야 한다.

JWT Access Token 검증은 Stateless하게 처리할 수 있지만,
Refresh Token 관리, 로그아웃, 강제만료, Rotation, 재사용 탐지에는 Stateful 요소가 들어갈 수 있다.
```

따라서 실무의 Access Token + Refresh Token 구조는 완전 Stateless라기보다 **Hybrid 인증 구조**에 가까운 경우가 많습니다.

---

## 3. 최종 문서 구성

문서는 다음 순서로 구성합니다.

```text
docs/
├─ 00_table_of_contents.md
├─ 01_jwt_basic_theory.md
├─ 02_stateful_stateless_auth.md
├─ 03_issue_summary.md
├─ 04_expected_flow.md
├─ 05_test_scenario.md
├─ 06_poc_implementation_notes.md
├─ 07_embedded_resource_failure_handling.md
├─ 08_customer_questions.md
├─ 09_observation_report_template.md
└─ 10_diagram_index.md
```

---

## 4. 문서 목록

| 번호 | 문서명                               | 파일명                                        | 목적                                                |
| -: | --------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| 00 | 문서 목차                             | `00_table_of_contents.md`                  | 전체 문서 구성, 읽는 순서, 핵심 메시지 안내                        |
| 01 | JWT 기본 이론                         | `01_jwt_basic_theory.md`                   | JWT, Access Token, Refresh Token의 역할과 저장/검증 구조 설명 |
| 02 | Stateful / Stateless 인증 방식        | `02_stateful_stateless_auth.md`            | 서버 세션 방식, JWT Stateless 방식, Hybrid JWT 구조 설명      |
| 03 | 이슈 요약                             | `03_issue_summary.md`                      | JWT 갱신 구조 이슈를 비전문가도 이해할 수 있게 요약                   |
| 04 | 정상 흐름 기준                          | `04_expected_flow.md`                      | Access Token 만료 시 정상적으로 기대되는 Refresh 흐름 정의        |
| 05 | 테스트 시나리오                          | `05_test_scenario.md`                      | PoC 시연 절차와 정상/비정상 판정 기준 정의                        |
| 06 | PoC 구현 메모                         | `06_poc_implementation_notes.md`           | 백엔드/프론트엔드 구현 구조와 핵심 로직 설명                         |
| 07 | Embedded Resource 및 다중 요청 실패 대처방안 | `07_embedded_resource_failure_handling.md` | 다중 요청/임베디드 리소스 처리 중 인증 실패가 발생할 때의 대처방안 정리         |
| 08 | 고객사 확인 질문                         | `08_customer_questions.md`                 | 고객사/개발사에 공식 확인할 항목 정리                             |
| 09 | 관찰 결과 보고서 양식                      | `09_observation_report_template.md`        | 실제 Network 로그 기반 관찰 결과를 정리하기 위한 양식                |
| 10 | 시퀀스 다이어그램 목록                      | `10_diagram_index.md`                      | PlantUML 다이어그램 목록과 참조 기준 정리                       |

---

## 5. 다이어그램 구성

다이어그램은 `docs/diagrams/` 하위에 저장합니다.

```text
docs/
└─ diagrams/
   ├─ D01_jwt_normal_flow.puml
   ├─ D02_jwt_access_expired_single_request.puml
   ├─ D03_jwt_problem_refresh_duplicated.puml
   ├─ D04_jwt_problem_only_one_retry.puml
   ├─ D05_jwt_single_flight_flow.puml
   ├─ D06_jwt_embedded_resource_handling.puml
   ├─ D07_jwt_refresh_with_access_token_rejected.puml
   ├─ D08_jwt_refresh_failure_queue_cleanup.puml
   ├─ D09_stateful_session_flow.puml
   ├─ D10_stateless_jwt_flow.puml
   └─ D11_hybrid_jwt_refresh_flow.puml
```

---

## 6. 다이어그램 목록

|  번호 | 다이어그램명                                      | 파일명                                               | 설명                                                                |
| --: | ------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| D01 | JWT 정상 로그인 및 API 요청 흐름                      | `D01_jwt_normal_flow.puml`                        | 로그인 후 유효한 Access Token으로 보호 API를 호출하는 정상 흐름                       |
| D02 | Access Token 만료 후 단일 요청 Refresh 흐름          | `D02_jwt_access_expired_single_request.puml`      | 단일 API 요청이 401을 받고 Refresh 후 재시도되는 흐름                             |
| D03 | 비정상: Refresh 요청 중복 발생                       | `D03_jwt_problem_refresh_duplicated.puml`         | API 8개 실패 시 Refresh 요청도 8회 발생하는 문제 흐름                             |
| D04 | 비정상: Refresh 1회이나 일부 요청만 복구                 | `D04_jwt_problem_only_one_retry.puml`             | Refresh는 1회이나 최초 요청만 재시도되고 나머지가 실패하는 흐름                           |
| D05 | 정상 개선: Refresh Single-Flight + Failed Queue | `D05_jwt_single_flight_flow.puml`                 | Refresh 1회 + 실패 요청 대기 + 새 토큰으로 전체 재시도 흐름                          |
| D06 | Embedded Resource 및 다중 요청 처리 기준             | `D06_jwt_embedded_resource_handling.puml`         | 정적 리소스와 보호 API 요청을 분리하고 Refresh를 단일화하는 흐름                         |
| D07 | Access Token으로 Refresh 시도 시 거부              | `D07_jwt_refresh_with_access_token_rejected.puml` | Access Token을 Refresh API에 넣었을 때 거부되어야 하는 흐름                      |
| D08 | Refresh 실패 시 대기열 정리                         | `D08_jwt_refresh_failure_queue_cleanup.puml`      | Refresh 실패 시 failedQueue와 토큰을 정리하는 흐름                             |
| D09 | Stateful 세션 인증 흐름                           | `D09_stateful_session_flow.puml`                  | 서버 세션 기반 Stateful 인증 흐름                                           |
| D10 | Stateless JWT 인증 흐름                         | `D10_stateless_jwt_flow.puml`                     | Access Token 자체 검증 기반 Stateless 인증 흐름                             |
| D11 | Hybrid JWT + Refresh Token 흐름               | `D11_hybrid_jwt_refresh_flow.puml`                | Access Token은 Stateless, Refresh Token은 Stateful하게 관리하는 Hybrid 구조 |

---

## 7. 권장 읽는 순서

### 7.1 비전문가 또는 의사결정자 대상

```text
01_jwt_basic_theory.md
→ 02_stateful_stateless_auth.md
→ 03_issue_summary.md
→ 04_expected_flow.md
→ 07_embedded_resource_failure_handling.md
→ D03_jwt_problem_refresh_duplicated.puml
→ D05_jwt_single_flight_flow.puml
```

이 순서는 기술 상세보다 핵심 개념, 문제 상황, 정상 개선 방향을 이해하는 데 적합합니다.

---

### 7.2 고객사/개발사 확인용

```text
03_issue_summary.md
→ 08_customer_questions.md
→ 05_test_scenario.md
→ 09_observation_report_template.md
```

이 순서는 고객사 또는 개발사에 확인 요청을 전달하고, 요청/응답 로그 기준으로 사실관계를 정리하는 데 적합합니다.

---

### 7.3 개발자 구현 참고용

```text
01_jwt_basic_theory.md
→ 02_stateful_stateless_auth.md
→ 04_expected_flow.md
→ 05_test_scenario.md
→ 06_poc_implementation_notes.md
→ 07_embedded_resource_failure_handling.md
→ 10_diagram_index.md
```

이 순서는 실제 PoC 구현 또는 기존 시스템 개선 방안을 검토하는 개발자에게 적합합니다.

---

### 7.4 성능시험 담당자 대상

```text
03_issue_summary.md
→ 05_test_scenario.md
→ 07_embedded_resource_failure_handling.md
→ 09_observation_report_template.md
→ D03_jwt_problem_refresh_duplicated.puml
→ D05_jwt_single_flight_flow.puml
```

이 순서는 성능시험 결과에 인증 갱신 트래픽이 어떤 영향을 주는지 설명하는 데 적합합니다.

---

## 8. 핵심 용어

| 용어                | 의미                                                                           |
| ----------------- | ---------------------------------------------------------------------------- |
| JWT               | JSON Web Token. Header, Payload, Signature로 구성된 토큰 형식                        |
| Access Token      | API 접근 인증에 사용하는 짧은 수명의 토큰                                                    |
| Refresh Token     | Access Token 재발급에 사용하는 상대적으로 긴 수명의 토큰                                        |
| 401 Unauthorized  | 인증 실패 또는 토큰 만료 시 일반적으로 반환되는 HTTP 상태 코드                                       |
| Single-Flight     | 동일 작업이 동시에 여러 번 발생하지 않도록 1회만 수행하고 나머지는 결과를 공유하는 방식                           |
| Failed Queue      | Refresh 진행 중 발생한 실패 요청을 임시 보관하는 대기열                                          |
| Retry             | 새 Access Token 발급 후 기존 실패 요청을 다시 보내는 처리                                      |
| Embedded Resource | HTML 응답 또는 화면 구성 과정에서 함께 로드되는 이미지, CSS, JS, 폰트, iframe, 기타 하위 리소스            |
| Stateful          | 서버가 사용자 인증 상태를 저장하고 관리하는 방식                                                  |
| Stateless         | 서버가 세션 상태를 저장하지 않고 요청에 포함된 토큰 자체를 검증하는 방식                                    |
| Hybrid 인증 구조      | 일반 API 요청은 Stateless하게 처리하고 Refresh Token, 로그아웃, 강제만료는 Stateful하게 관리하는 혼합 구조 |

---

## 9. 문제 상황 요약

본 문서 세트에서 다루는 대표 문제 상황은 다음과 같습니다.

```text
1. 화면 진입 시 API 요청 또는 Embedded Resource 요청이 여러 개 발생한다.
2. Access Token이 만료된 상태에서 여러 요청이 동시에 인증 실패한다.
3. 각 실패 요청이 개별적으로 Refresh 요청을 수행한다.
4. 그 결과 Refresh 요청이 실패 요청 수만큼 반복 발생한다.
5. 또는 Refresh 요청은 1회로 제한했지만 최초 요청만 재시도되고 나머지 요청은 실패한다.
6. 이로 인해 사용자 화면 오류, 응답 지연, 인증 서버 부하, 성능시험 결과 왜곡이 발생할 수 있다.
```

이 문제의 핵심은 요청 수 자체가 아닙니다.

```text
요청이 여러 개 발생하는 것은 화면 구조상 정상일 수 있다.
문제는 Access Token 만료 시 인증 실패 요청들이 어떻게 복구되는지이다.
```

---

## 10. 정상 개선 방향 요약

정상 개선 방향은 다음과 같습니다.

```text
1. Access Token과 Refresh Token의 역할을 명확히 분리한다.
2. Access Token 만료 시 Refresh Token 또는 세션 식별값으로만 새 Access Token을 발급한다.
3. Refresh 요청은 공통 API 클라이언트에서 1회로 단일화한다.
4. Refresh 진행 중 발생한 실패 요청은 대기열에 보관한다.
5. 새 Access Token 발급 후 기존 실패 요청을 모두 재시도한다.
6. Refresh 실패 시 대기열과 토큰을 정리하고 세션 만료 처리한다.
7. 정적 리소스, 보호 리소스, 업무 API, 인증 API, OPTIONS 요청을 분리한다.
8. 성능시험에서는 업무 API 성능과 인증 갱신 트래픽을 구분해서 분석한다.
```

---

## 11. 성능 관점 핵심 정리

성능시험 관점에서 중요한 점은 다음입니다.

```text
Access Token 만료 시 실패 요청 수만큼 Refresh 요청이 발생하면,
업무 API 성능이 아니라 인증 갱신 병목이 성능시험 결과에 반영될 수 있다.
```

예시:

```text
사용자 1명
API 요청 8개 인증 실패
Refresh 요청 8회 발생

동시 사용자 100명
API 요청 800개 인증 실패
Refresh 요청 800회 발생 가능
```

이는 다음 영역에 부하를 줄 수 있습니다.

```text
1. 인증 서버
2. WAS
3. Redis
4. DB
5. 네트워크
6. 클라이언트 화면 렌더링
```

따라서 성능시험 전 JWT 갱신 구조를 별도로 검증해야 합니다.

---

## 12. 보안 관점 핵심 정리

보안 관점에서 중요한 점은 다음입니다.

```text
Access Token은 API 접근권이다.
Refresh Token은 Access Token 재발급권이다.

만료된 Access Token만으로 새 Access Token이 발급된다면,
Access Token과 Refresh Token의 역할 분리가 약해질 수 있다.
```

확인해야 할 항목은 다음입니다.

```text
1. Refresh Token이 실제로 존재하는지
2. Refresh 요청 시 클라이언트가 어떤 값을 전달하는지
3. 해당 값이 Cookie, Header, Body, Session ID 중 어디에 있는지
4. 서버가 그 값을 DB, Redis, Session Store 등과 대조하는지
5. 만료된 Access Token만으로 재발급 가능한지
6. 로그아웃 또는 강제 만료 시 재발급이 차단되는지
7. Refresh Token Rotation 또는 재사용 탐지 정책이 있는지
```

---

## 13. Stateful / Stateless 관점 핵심 정리

JWT를 사용한다고 해서 무조건 완전 Stateless 구조가 되는 것은 아닙니다.

```text
Access Token 검증:
JWT 서명과 만료시간을 검증하므로 Stateless하게 처리 가능

Refresh Token 관리:
DB, Redis, Session Store 등과 대조할 수 있으므로 Stateful 요소 포함 가능
```

따라서 실무 구조는 다음처럼 Hybrid 방식일 수 있습니다.

```text
일반 API 요청:
Access Token으로 Stateless 검증

Access Token 재발급:
Refresh Token 또는 세션 식별값을 서버 저장소와 대조

로그아웃/강제만료:
서버 저장소에서 Refresh Token 또는 세션 상태 폐기
```

중요한 것은 Stateful인지 Stateless인지 명칭이 아니라, **서버가 어떤 값을 근거로 사용자를 신뢰하고 새 Access Token을 발급하는지**입니다.

---

## 14. Embedded Resource 관련 핵심 정리

Embedded Resource는 화면 렌더링 과정에서 함께 로드되는 하위 리소스입니다.

예시:

```text
JavaScript
CSS
Image
Font
iframe
첨부파일
정적 파일
```

Embedded Resource 또는 화면 구성 API 때문에 요청 수가 늘어날 수는 있습니다.

그러나 다음 결론은 성립하지 않습니다.

```text
요청이 8개 발생했으므로 Refresh도 8번 발생해도 정상이다.
```

정확한 기준은 다음입니다.

```text
요청 수 증가 원인과 Refresh 중복 발생 원인은 분리해서 봐야 한다.

요청 수 증가:
화면 구조, API 분리, Embedded Resource, 브라우저 동작, JMeter 옵션 영향

Refresh 중복 발생:
Access Token 만료 시 인증 갱신 로직이 요청별로 따로 실행되는 문제
```

---

## 15. 고객사/개발사 확인 핵심 질문

고객사 또는 개발사에 반드시 확인해야 할 질문은 다음입니다.

```text
1. Access Token 만료시간은 얼마입니까?
2. Refresh Token은 실제로 존재합니까?
3. Refresh 요청 시 클라이언트가 전달하는 값은 무엇입니까?
4. 해당 값은 Cookie, Header, Body, Session ID 중 어디에 포함됩니까?
5. Refresh Token은 서버에서 DB/Redis/Session Store와 대조됩니까?
6. 만료된 Access Token만으로 새 Access Token이 발급됩니까?
7. 동시에 8개 API가 401을 받으면 Refresh 요청은 몇 번 발생합니까?
8. Refresh 성공 후 기존 실패 요청들은 자동 재시도됩니까?
9. Refresh API는 자동 Refresh 대상에서 제외되어 있습니까?
10. 로그아웃 또는 강제 로그아웃 시 Refresh Token은 폐기됩니까?
```

---

## 16. PoC의 역할

본 PoC는 운영 시스템의 완성형 인증 모듈이 아닙니다.

본 PoC의 역할은 다음과 같습니다.

```text
1. Access Token 만료 상황 재현
2. 동시 API 요청 실패 상황 재현
3. Refresh 요청 중복 발생 여부 확인
4. Refresh 요청 단일화 구조 설명
5. 실패 요청 대기열 및 재시도 구조 설명
6. Access Token과 Refresh Token 역할 분리 검증
7. 고객사/개발사와 기술 논점을 명확히 분리
```

PoC로 증명하려는 것은 다음입니다.

```text
Access Token 만료 시 여러 요청이 동시에 실패해도,
Refresh 요청은 1회만 발생할 수 있다.

그리고 Refresh 성공 후 기존 실패 요청들을 모두 재시도할 수 있다.
```

---

## 17. 파일명 변경 기준

기존 문서 번호를 개편했다면 다음 기준으로 정리합니다.

```text
09_jwt_basic_theory.md
→ 01_jwt_basic_theory.md

10_stateful_stateless_auth.md
→ 02_stateful_stateless_auth.md

01_issue_summary.md
→ 03_issue_summary.md

02_expected_flow.md
→ 04_expected_flow.md

03_test_scenario.md
→ 05_test_scenario.md

05_poc_implementation_notes.md
→ 06_poc_implementation_notes.md

06_embedded_resource_failure_handling.md
→ 07_embedded_resource_failure_handling.md

04_customer_questions.md
→ 08_customer_questions.md

07_observation_report_template.md
→ 09_observation_report_template.md

08_diagram_index.md
→ 10_diagram_index.md
```

다이어그램 번호는 문서 번호와 별도로 `D01~D11`을 유지합니다.

---

## 18. 최종 정리

본 문서 세트의 결론은 다음과 같습니다.

```text
요청이 여러 개 발생하는 원인은 별도 분석 대상이다.
요청이 여러 개 발생한다고 해서 Refresh 요청도 여러 번 발생해야 하는 것은 아니다.

Access Token 만료 시 Refresh는 공통 제어 로직에서 1회로 제한하고,
동시에 실패한 요청은 대기 후 새 Access Token으로 재시도해야 한다.

Access Token과 Refresh Token의 역할은 분리되어야 하며,
Refresh 요청 시 서버가 무엇을 근거로 새 Access Token을 발급하는지 명확해야 한다.

이 구조가 확인되지 않으면 성능시험 결과 신뢰성과 인증 구조 안정성에 영향을 줄 수 있다.
```
