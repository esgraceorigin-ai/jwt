# JWT 갱신 구조 관찰 결과 보고서 양식

## 1. 문서 목적

본 문서는 JWT Access Token 만료 및 Refresh 처리 흐름을 실제 요청/응답 로그 기준으로 관찰하고, 그 결과를 정리하기 위한 보고서 양식입니다.

본 문서의 목적은 다음과 같습니다.

```text
1. Access Token 만료 시 실제 서버 응답 확인
2. Refresh 요청 발생 횟수 확인
3. Refresh 요청에 사용되는 값 확인
4. Refresh 성공 후 기존 실패 요청 재시도 여부 확인
5. Refresh 중복 발생 여부 확인
6. 성능시험 결과에 영향을 줄 수 있는 인증 흐름 문제 정리
7. 고객사/개발사와 논의할 객관 증적 정리
```

본 문서는 추정이나 구두 설명이 아니라, 브라우저 Network 로그, Fiddler, Burp Suite, JMeter 결과, 서버 로그 등 객관 자료를 기준으로 작성합니다.

---

## 2. 기본 정보

| 항목               | 내용                                              |
| ---------------- | ----------------------------------------------- |
| 프로젝트명            |                                                 |
| 시스템명             |                                                 |
| 테스트 일시           |                                                 |
| 작성자              |                                                 |
| 테스트 환경           | 개발 / 검증 / 운영 / 기타                               |
| 프론트엔드 URL        |                                                 |
| 백엔드 API Base URL |                                                 |
| 브라우저             | Chrome / Edge / 기타                              |
| 캡처 도구            | Browser DevTools / Fiddler / Burp / JMeter / 기타 |
| 테스트 계정           |                                                 |
| 비고               |                                                 |

---

## 3. 테스트 목적

본 테스트의 목적은 다음과 같습니다.

```text
Access Token 만료 시 여러 API 요청이 동시에 인증 실패하는 상황에서,
Refresh 요청이 실패 요청 수만큼 중복 발생하는지,
또는 Refresh 요청 1회 후 기존 실패 요청들이 정상적으로 재시도되는지 확인한다.
```

확인 대상은 API 요청 수 자체가 아닙니다.

핵심 확인 대상은 다음입니다.

```text
1. Access Token 만료 시 서버 응답
2. Refresh 요청 발생 조건
3. Refresh 요청 횟수
4. Refresh 요청에 사용되는 인증 값
5. Refresh 성공 후 기존 실패 요청 재시도 여부
6. Refresh 실패 시 처리 방식
```

---

## 4. 사전 확인 정보

### 4.1 토큰 정책

| 항목                    | 확인 결과                                     |
| --------------------- | ----------------------------------------- |
| Access Token 존재 여부    |                                           |
| Access Token 만료시간     |                                           |
| Refresh Token 존재 여부   |                                           |
| Refresh Token 만료시간    |                                           |
| Refresh Token 전달 방식   | Cookie / Header / Body / Session ID / 불명확 |
| Refresh Token 서버 저장소  | DB / Redis / Session Store / Memory / 불명확 |
| Token Rotation 적용 여부  | 적용 / 미적용 / 불명확                            |
| Access Token 블랙리스트 여부 | 있음 / 없음 / 불명확                             |

---

### 4.2 인증 API 정보

| 항목               | 확인 결과                     |
| ---------------- | ------------------------- |
| 로그인 API          |                           |
| Refresh API      |                           |
| 로그아웃 API         |                           |
| 보호 API 예시        |                           |
| 인증 실패 응답 코드      | 401 / 403 / 200+업무코드 / 기타 |
| Refresh 실패 응답 코드 | 401 / 403 / 기타            |
| OPTIONS 인증 제외 여부 | 예 / 아니오 / 불명확             |

---

## 5. 관찰 대상 시나리오

이번 관찰에서 수행한 시나리오를 선택합니다.

| 번호 | 시나리오                                 | 수행 여부 |
| -: | ------------------------------------ | ----- |
|  1 | 로그인 및 토큰 발급 확인                       |       |
|  2 | Access Token 유효 상태에서 보호 API 호출       |       |
|  3 | Access Token 만료 후 단일 API 호출          |       |
|  4 | Access Token 만료 후 여러 API 동시 호출       |       |
|  5 | Refresh Token 없이 Refresh 시도          |       |
|  6 | Access Token으로 Refresh 시도            |       |
|  7 | 로그아웃 후 기존 Refresh Token으로 Refresh 시도 |       |
|  8 | Refresh 실패 시 대기 요청 정리 확인             |       |
|  9 | Embedded Resource 또는 하위 요청 실패 확인     |       |
| 10 | JMeter 스크립트 재현 확인                    |       |

---

## 6. 요청/응답 관찰 결과 요약

| 항목                 | 관찰 결과 |
| ------------------ | ----- |
| 화면 진입 시 총 요청 수     |       |
| 보호 API 요청 수        |       |
| 정적 리소스 요청 수        |       |
| OPTIONS 요청 수       |       |
| 최초 401 발생 수        |       |
| Refresh 요청 수       |       |
| Refresh 성공 여부      |       |
| Refresh 후 재시도 요청 수 |       |
| 최종 성공 요청 수         |       |
| 최종 실패 요청 수         |       |
| 사용자 화면 오류 여부       |       |
| 특이사항               |       |

---

## 7. 로그인 요청 관찰

### 7.1 요청 정보

| 항목                   | 내용   |
| -------------------- | ---- |
| Request URL          |      |
| Method               | POST |
| Status Code          |      |
| Request Header 주요 값  |      |
| Request Body 주요 값    |      |
| Response Header 주요 값 |      |
| Response Body 주요 값   |      |

### 7.2 확인 사항

| 확인 항목                      | 결과                         |
| -------------------------- | -------------------------- |
| Access Token 발급 여부         | 예 / 아니오                    |
| Refresh Token 발급 여부        | 예 / 아니오 / Cookie로 추정 / 불명확 |
| Refresh Token이 Body에 포함됨   | 예 / 아니오                    |
| Refresh Token이 Cookie로 설정됨 | 예 / 아니오                    |
| HttpOnly Cookie 사용 여부      | 예 / 아니오 / 불명확              |
| Secure Cookie 사용 여부        | 예 / 아니오 / 불명확              |
| SameSite 속성 확인             | Lax / Strict / None / 불명확  |

### 7.3 관찰 내용

```text
작성 예시:
로그인 요청은 200 OK로 응답되었으며, Response Body에 accessToken이 포함되어 있었다.
refreshToken은 Response Body에는 보이지 않았고, Set-Cookie 헤더 사용 여부는 추가 확인이 필요하다.
```

---

## 8. Access Token 유효 상태 API 호출 관찰

### 8.1 요청 정보

| 항목                         | 내용                 |
| -------------------------- | ------------------ |
| Request URL                |                    |
| Method                     | GET / POST / 기타    |
| Status Code                |                    |
| Authorization Header 포함 여부 | 예 / 아니오            |
| 사용된 토큰 유형                  | Access Token / 불명확 |
| Refresh 요청 발생 여부           | 예 / 아니오            |

### 8.2 정상 기준

```text
Access Token이 유효한 상태에서는 보호 API가 200 OK로 응답되어야 하며,
Refresh 요청은 발생하지 않아야 한다.
```

### 8.3 관찰 결과

| 확인 항목                      | 결과      |
| -------------------------- | ------- |
| 보호 API 정상 응답               | 예 / 아니오 |
| 불필요한 Refresh 발생            | 예 / 아니오 |
| Authorization Header 정상 포함 | 예 / 아니오 |
| 일부 요청 실패 여부                | 예 / 아니오 |

### 8.4 관찰 내용

```text
작성:
```

---

## 9. Access Token 만료 후 단일 API 호출 관찰

### 9.1 시나리오

```text
1. 로그인한다.
2. Access Token 만료시간 이상 대기한다.
3. 보호 API 1개를 호출한다.
4. 최초 요청의 인증 실패 여부를 확인한다.
5. Refresh 요청 발생 여부를 확인한다.
6. Refresh 성공 후 기존 요청 재시도 여부를 확인한다.
```

### 9.2 관찰 결과

| 단계 | 요청            | 응답 코드 | 비고 |
| -: | ------------- | ----: | -- |
|  1 | 보호 API 최초 요청  |       |    |
|  2 | Refresh 요청    |       |    |
|  3 | 보호 API 재시도 요청 |       |    |

### 9.3 정상 기준

```text
보호 API 최초 요청
→ 401 Unauthorized

Refresh 요청
→ 200 OK

보호 API 재시도 요청
→ 200 OK
```

### 9.4 관찰 내용

```text
작성:
```

---

## 10. Access Token 만료 후 다중 API 호출 관찰

### 10.1 시나리오

```text
1. 로그인한다.
2. Access Token 만료시간 이상 대기한다.
3. 화면 진입 또는 버튼 클릭으로 여러 API를 동시에 호출한다.
4. 최초 API 요청들의 401 여부를 확인한다.
5. Refresh 요청 발생 횟수를 확인한다.
6. Refresh 성공 후 기존 실패 요청들이 재시도되는지 확인한다.
```

### 10.2 요청 목록

| 순번 | Request URL | Method | 최초 응답 | 재시도 여부 | 최종 응답 |
| -: | ----------- | ------ | ----: | ------ | ----: |
|  1 |             |        |       |        |       |
|  2 |             |        |       |        |       |
|  3 |             |        |       |        |       |
|  4 |             |        |       |        |       |
|  5 |             |        |       |        |       |
|  6 |             |        |       |        |       |
|  7 |             |        |       |        |       |
|  8 |             |        |       |        |       |

### 10.3 Refresh 요청 관찰

| 항목                   | 결과 |
| -------------------- | -- |
| 최초 실패 요청 수           |    |
| Refresh 요청 수         |    |
| Refresh 성공 여부        |    |
| 새 Access Token 발급 여부 |    |
| 재시도 요청 수             |    |
| 최종 성공 수              |    |
| 최종 실패 수              |    |

### 10.4 정상 기준

```text
API 요청 8개가 동시에 401을 받더라도,
Refresh 요청은 1회만 발생해야 한다.

Refresh 성공 후 기존 실패 요청 8개가 새 Access Token으로 재시도되어야 한다.
```

### 10.5 비정상 기준

다음 중 하나라도 해당하면 구조 점검 대상입니다.

```text
1. API 요청 8개 실패 시 Refresh 요청도 8회 발생
2. Refresh 요청은 1회이나 최초 요청 1개만 성공하고 나머지 요청 실패
3. Refresh 성공 후 기존 실패 요청이 재시도되지 않음
4. Refresh 이후에도 기존 Access Token으로 재시도
5. Refresh 요청이 무한 반복
6. 최종 화면에 일부 데이터 누락 또는 오류 발생
```

### 10.6 관찰 내용

```text
작성:
```

---

## 11. Access Token으로 Refresh 시도 관찰

### 11.1 시나리오

```text
1. 로그인한다.
2. 발급된 Access Token을 복사한다.
3. Refresh API의 refreshToken 필드 또는 Refresh 전달 위치에 Access Token을 넣는다.
4. 서버 응답을 확인한다.
```

### 11.2 요청 정보

| 항목            | 내용           |
| ------------- | ------------ |
| Request URL   |              |
| Method        | POST         |
| 전달한 값         | Access Token |
| Status Code   |              |
| Response Body |              |

### 11.3 정상 기준

```text
Access Token으로 Refresh를 시도하면 거부되어야 한다.
```

예상 응답:

```text
401 Unauthorized
Token is not refresh token
```

### 11.4 관찰 결과

| 확인 항목                            | 결과            |
| -------------------------------- | ------------- |
| Access Token으로 Refresh 성공 여부     | 성공 / 실패       |
| 서버가 token type을 구분함              | 예 / 아니오 / 불명확 |
| 만료된 Access Token으로 Refresh 가능 여부 | 가능 / 불가 / 미확인 |

### 11.5 관찰 내용

```text
작성:
```

---

## 12. Refresh Token 없이 Refresh 시도 관찰

### 12.1 시나리오

```text
1. Refresh Token 또는 세션 식별값을 전달하지 않는다.
2. Refresh API를 호출한다.
3. 새 Access Token이 발급되는지 확인한다.
```

### 12.2 정상 기준

```text
Refresh Token 또는 세션 식별값 없이 새 Access Token이 발급되면 안 된다.
```

예상 응답:

```text
401 Unauthorized
Missing refresh token
```

### 12.3 관찰 결과

| 확인 항목                       | 결과            |
| --------------------------- | ------------- |
| Refresh Token 없이 Refresh 가능 | 예 / 아니오       |
| 서버가 사용자/세션을 어떻게 식별하는지 명확함   | 예 / 아니오 / 불명확 |
| Cookie 기반 식별값 존재            | 예 / 아니오 / 불명확 |

### 12.4 관찰 내용

```text
작성:
```

---

## 13. 로그아웃 후 Refresh 관찰

### 13.1 시나리오

```text
1. 로그인한다.
2. 로그아웃 API를 호출한다.
3. 기존 Refresh Token 또는 세션 식별값으로 Refresh를 다시 시도한다.
4. 서버 응답을 확인한다.
```

### 13.2 정상 기준

```text
로그아웃 후 기존 Refresh Token으로 새 Access Token이 발급되면 안 된다.
```

예상 응답:

```text
401 Unauthorized
Refresh token not found or revoked
```

### 13.3 관찰 결과

| 확인 항목                    | 결과            |
| ------------------------ | ------------- |
| 로그아웃 API 호출 성공           | 예 / 아니오       |
| 서버 저장소의 Refresh Token 폐기 | 예 / 아니오 / 불명확 |
| 로그아웃 후 Refresh 가능        | 예 / 아니오       |
| 강제 로그아웃 구조 추정 가능         | 예 / 아니오 / 불명확 |

### 13.4 관찰 내용

```text
작성:
```

---

## 14. Refresh 실패 시 대기 요청 정리 관찰

### 14.1 시나리오

```text
1. 로그인한다.
2. Refresh Token을 제거하거나 잘못된 값으로 변경한다.
3. Access Token 만료 후 여러 API를 동시에 호출한다.
4. Refresh 실패 후 대기 중인 요청들이 정리되는지 확인한다.
```

### 14.2 정상 기준

```text
Refresh 실패 시 대기열의 요청들이 모두 실패 처리되어야 하며,
무한 로딩 또는 pending 상태로 남으면 안 된다.
```

### 14.3 관찰 결과

| 확인 항목                 | 결과      |
| --------------------- | ------- |
| Refresh 요청 실패         | 예 / 아니오 |
| 대기 요청 전체 실패 처리        | 예 / 아니오 |
| 토큰 정리                 | 예 / 아니오 |
| 로그인 화면 이동 또는 세션 만료 안내 | 예 / 아니오 |
| 무한 로딩 발생              | 예 / 아니오 |

### 14.4 관찰 내용

```text
작성:
```

---

## 15. Embedded Resource 및 하위 요청 관찰

### 15.1 요청 분류

화면 진입 시 발생한 요청을 다음과 같이 분류합니다.

| 순번 | Request URL | 유형                | 인증 필요 여부 | 응답 코드 | 비고 |
| -: | ----------- | ----------------- | -------- | ----: | -- |
|  1 |             | 업무 API            | 예 / 아니오  |       |    |
|  2 |             | 인증 API            | 예 / 아니오  |       |    |
|  3 |             | 정적 리소스            | 예 / 아니오  |       |    |
|  4 |             | Embedded Resource | 예 / 아니오  |       |    |
|  5 |             | OPTIONS           | 예 / 아니오  |       |    |

요청 유형 예시:

```text
업무 API
인증 API
Refresh API
정적 리소스
보호 리소스
Embedded Resource
OPTIONS
외부 도메인 요청
```

### 15.2 확인 기준

```text
Embedded Resource 또는 정적 리소스 때문에 요청 수가 증가할 수는 있다.

그러나 요청 수 증가가 Refresh 요청 중복 발생을 정당화하지는 않는다.
```

### 15.3 관찰 결과

| 확인 항목                                | 결과      |
| ------------------------------------ | ------- |
| Embedded Resource 요청 발생              | 예 / 아니오 |
| 정적 리소스가 인증 대상에 포함됨                   | 예 / 아니오 |
| OPTIONS 요청이 인증 실패함                   | 예 / 아니오 |
| 보호 리소스와 정적 리소스 경로가 분리됨               | 예 / 아니오 |
| Embedded Resource 실패가 업무 API 실패와 구분됨 | 예 / 아니오 |

### 15.4 관찰 내용

```text
작성:
```

---

## 16. JMeter 재현 관찰

### 16.1 JMeter 설정

| 항목                              | 설정값                                      |
| ------------------------------- | ---------------------------------------- |
| Thread 수                        |                                          |
| Ramp-up                         |                                          |
| Loop Count                      |                                          |
| Think Time                      |                                          |
| Retrieve All Embedded Resources | 사용 / 미사용                                 |
| URLs must match 필터              |                                          |
| Cookie Manager 사용 여부            | 예 / 아니오                                  |
| Header Manager 사용 여부            | 예 / 아니오                                  |
| 토큰 추출 방식                        | JSON Extractor / Regular Expression / 기타 |
| Refresh 처리 방식                   | 수동 / 자동 / 미구현                            |

### 16.2 관찰 결과

| 항목                     | 결과 |
| ---------------------- | -- |
| 업무 API 요청 수            |    |
| Embedded Resource 요청 수 |    |
| 401 발생 수               |    |
| Refresh 요청 수           |    |
| 최종 오류율                 |    |
| 평균 응답시간                |    |
| Refresh API 평균 응답시간    |    |
| 특이사항                   |    |

### 16.3 분석 내용

```text
작성:
```

---

## 17. 성능 영향 분석

### 17.1 관찰된 성능 영향

| 항목             | 영향 여부         | 설명 |
| -------------- | ------------- | -- |
| 인증 서버 부하 증가    | 예 / 아니오 / 불명확 |    |
| DB/Redis 부하 증가 | 예 / 아니오 / 불명확 |    |
| 네트워크 요청 증가     | 예 / 아니오 / 불명확 |    |
| API 응답시간 증가    | 예 / 아니오 / 불명확 |    |
| 오류율 증가         | 예 / 아니오 / 불명확 |    |
| 사용자 화면 지연      | 예 / 아니오 / 불명확 |    |
| 성능시험 결과 왜곡 가능성 | 예 / 아니오 / 불명확 |    |

### 17.2 분석 문구

```text
작성 예시:
Access Token 만료 시점에 보호 API 요청 다수가 401로 응답되었으며, Refresh 요청이 동일 사용자 세션 기준 1회가 아닌 여러 차례 발생하였다. 이 경우 성능시험 결과에 업무 API 처리 성능뿐 아니라 인증 갱신 트래픽과 인증 서버 부하가 함께 반영될 수 있다.
```

---

## 18. 보안 영향 분석

### 18.1 관찰된 보안 영향

| 항목                                    | 영향 여부         | 설명 |
| ------------------------------------- | ------------- | -- |
| Access Token과 Refresh Token 역할 분리 불명확 | 예 / 아니오 / 불명확 |    |
| 만료된 Access Token 기반 재발급 가능            | 예 / 아니오 / 불명확 |    |
| Refresh Token 전달 위치 불명확               | 예 / 아니오 / 불명확 |    |
| 서버 저장소 대조 여부 불명확                      | 예 / 아니오 / 불명확 |    |
| 로그아웃 후 재발급 가능                         | 예 / 아니오 / 불명확 |    |
| 강제만료 통제 어려움                           | 예 / 아니오 / 불명확 |    |
| Refresh Token 재사용 탐지 불명확              | 예 / 아니오 / 불명확 |    |

### 18.2 분석 문구

```text
작성 예시:
Refresh 요청 시 서버가 어떤 값을 기준으로 새 Access Token을 발급하는지 명확하지 않다. 특히 만료된 Access Token만으로 재발급이 가능하다면 Access Token과 Refresh Token의 역할 분리가 약화될 수 있으며, 짧은 Access Token 만료시간의 보안 효과가 제한될 수 있다.
```

---

## 19. 정상/비정상 판정

### 19.1 판정표

| 항목                        | 정상 기준         | 관찰 결과 | 판정      |
| ------------------------- | ------------- | ----- | ------- |
| Access Token 유효 상태 API 호출 | 200 OK        |       | 정상 / 점검 |
| Access Token 만료 상태 API 호출 | 401 후 Refresh |       | 정상 / 점검 |
| Refresh 요청 횟수             | 사용자 세션 기준 1회  |       | 정상 / 점검 |
| 실패 요청 재시도                 | 전체 재시도        |       | 정상 / 점검 |
| Access Token으로 Refresh    | 거부            |       | 정상 / 점검 |
| Refresh Token 없이 Refresh  | 거부            |       | 정상 / 점검 |
| 로그아웃 후 Refresh            | 거부            |       | 정상 / 점검 |
| Refresh 실패 시 대기열          | 전체 정리         |       | 정상 / 점검 |
| Embedded Resource 실패 구분   | 업무 API와 분리    |       | 정상 / 점검 |

---

## 20. 종합 의견

```text
작성:
```

작성 예시:

```text
현재 관찰 결과, 화면 진입 시 여러 API 요청이 발생하는 것은 일반적인 웹 구조로 볼 수 있다. 그러나 Access Token 만료 시 여러 요청이 동시에 인증 실패한 뒤 Refresh 요청이 중복 발생하거나, Refresh 이후 일부 요청만 재시도되는 경우 성능시험 결과 신뢰성과 사용자 화면 복구 흐름에 영향을 줄 수 있다.

또한 Refresh 요청 시 사용되는 값과 서버 측 검증 기준이 명확하지 않은 경우 Access Token과 Refresh Token의 역할 분리 여부를 추가 확인해야 한다.

따라서 성능시험 전 Refresh 요청 횟수, 실패 요청 재시도 여부, Refresh Token 전달 및 검증 방식에 대한 확인이 필요하다.
```

---

## 21. 개선 권고사항

관찰 결과에 따라 해당 항목을 선택합니다.

```text
1. Access Token과 Refresh Token의 역할 분리 명확화
2. Refresh 요청 시 Refresh Token 또는 세션 식별값 사용
3. 만료된 Access Token만으로 재발급되는 구조 점검
4. Refresh 요청 single-flight 처리 적용
5. 실패 요청 failedQueue 처리 적용
6. Refresh 성공 후 기존 실패 요청 전체 재시도
7. Refresh 실패 시 대기열 정리 및 세션 만료 처리
8. Refresh API 자동 Refresh 대상 제외
9. OPTIONS 요청 인증 제외
10. 정적 리소스와 보호 API 경로 분리
11. Embedded Resource 요청과 업무 API 요청 분리 분석
12. JMeter 테스트 시 Embedded Resource 옵션 및 URL 필터 재검토
13. 인증 갱신 트래픽과 업무 API 성능 지표 분리
14. Refresh Token 서버 저장소 및 폐기 정책 명확화
15. 로그아웃/강제만료/Rotation/재사용 탐지 정책 검토
```

---

## 22. 고객사/개발사 확인 요청 사항

| 번호 | 확인 요청 사항                                                  | 답변 |
| -: | --------------------------------------------------------- | -- |
|  1 | Refresh Token이 실제로 존재합니까?                                 |    |
|  2 | Refresh 요청 시 클라이언트가 전달하는 값은 무엇입니까?                        |    |
|  3 | 해당 값은 Cookie, Header, Body, Session ID 중 어디에 포함됩니까?       |    |
|  4 | 서버는 Refresh Token 또는 세션 값을 DB/Redis/Session Store와 대조합니까? |    |
|  5 | 만료된 Access Token만으로 새 Access Token이 발급됩니까?                |    |
|  6 | 동시에 여러 API가 401을 받으면 Refresh 요청은 몇 번 발생합니까?               |    |
|  7 | Refresh 성공 후 기존 실패 요청들은 자동 재시도됩니까?                        |    |
|  8 | Refresh API는 자동 Refresh 대상에서 제외되어 있습니까?                   |    |
|  9 | 로그아웃 후 기존 Refresh Token은 폐기됩니까?                           |    |
| 10 | Refresh Token Rotation 또는 재사용 탐지 정책이 있습니까?                |    |

---

## 23. 첨부 증적 목록

| 번호 | 증적명                          | 파일명 또는 위치 | 비고 |
| -: | ---------------------------- | --------- | -- |
|  1 | 로그인 요청/응답 캡처                 |           |    |
|  2 | Access Token 유효 상태 API 캡처    |           |    |
|  3 | Access Token 만료 상태 API 캡처    |           |    |
|  4 | Refresh 요청/응답 캡처             |           |    |
|  5 | Refresh 후 재시도 요청 캡처          |           |    |
|  6 | Access Token으로 Refresh 시도 캡처 |           |    |
|  7 | 로그아웃 후 Refresh 시도 캡처         |           |    |
|  8 | JMeter 결과 파일                 |           |    |
|  9 | 서버 로그                        |           |    |
| 10 | 브라우저 Network HAR 파일          |           |    |

---

## 24. 최종 결론

```text
작성:
```

작성 예시:

```text
본 관찰 결과는 API 요청이 여러 개 발생하는 사실 자체를 문제로 판단하기 위한 것이 아니다.

핵심은 Access Token 만료 시 여러 인증 실패 요청이 발생했을 때 Refresh 요청이 중복 발생하는지, Refresh 이후 기존 실패 요청들이 정상적으로 재시도되는지 여부이다.

관찰 결과 Refresh 요청이 실패 요청 수만큼 발생하거나, Refresh 1회 후 일부 요청만 복구된다면 JWT 갱신 구조와 프론트엔드 요청 재시도 로직에 대한 개선 검토가 필요하다.

또한 Refresh 요청 시 서버가 어떤 값을 근거로 새 Access Token을 발급하는지 명확하지 않다면 Access Token과 Refresh Token의 역할 분리 및 보안 정책 유효성에 대한 추가 확인이 필요하다.
```
