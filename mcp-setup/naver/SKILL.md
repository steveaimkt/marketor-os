# 네이버 설치 가이드 (데이터랩 + 검색광고)

> ⚠️ **네이버는 완전히 다른 두 API 세계**가 있습니다. 혼동하면 설치가 안 됩니다.
> - **A. 데이터랩 (DataLab)** = 검색어 트렌드·쇼핑인사이트 → `developers.naver.com` → **npm MCP**
> - **B. 검색광고 (SearchAd)** = 광고비·ROAS·키워드 검색량 → `manage.searchad.naver.com` → **REST(공식 MCP 없음)**
>
> 실행·활용 전체 파이프라인은 `skills/mcp설치-네이버` 스킬이 담당합니다. 이 문서는 **설치·검증**만 다룹니다.

---

## A. 데이터랩 DataLab (MCP · 검색어·쇼핑 트렌드)

**1. 키 발급** (약 3분)
1. https://developers.naver.com → 로그인 → **Application → 애플리케이션 등록**
2. 사용 API에서 **「데이터랩(검색어트렌드)」 + 「데이터랩(쇼핑인사이트)」** 둘 다 체크
3. 등록 후 **Client ID · Client Secret** 발급

**2. `.env` 등록**
```bash
NAVER_CLIENT_ID=발급받은_클라이언트_ID
NAVER_CLIENT_SECRET=발급받은_시크릿
```

**3. MCP 등록** — `.mcp.json`에 이미 포함돼 있습니다(패키지 `naver-datalab-mcp-server`).
키를 `.env`에 넣고 Claude Code를 재시작하면 자동 연결됩니다.

**4. 검증**
> "네이버 데이터랩으로 '마케팅 자동화' 검색 트렌드 뽑아줘"

시계열 데이터가 나오면 성공입니다.

**할 수 있는 것**: 검색어 트렌드(시계열·성별·연령·디바이스), 쇼핑인사이트(분야·키워드 트렌드)
**못 하는 것**: 광고 성과(ROAS·광고비) → 아래 B가 필요합니다.

---

## B. 검색광고 SearchAd (REST · 광고 성과)

> 공식 MCP가 없어 REST 서명 호출을 씁니다. 구현체는 `scripts/naver_searchad.py`(의존성 0)라 **별도 설치 불필요**합니다.

**1. 키 발급** (약 3분 · 광고 계정 필요)
1. https://manage.searchad.naver.com 로그인
2. **도구 → API 사용 관리** → 3개 발급
   - `API_KEY` (액세스 라이선스)
   - `SECRET_KEY` (`AQAA...==` 형태)
   - `CUSTOMER_ID` (계정 번호, 숫자)

**2. `.env` 등록**
```bash
NAVER_SEARCHAD_API_KEY=액세스_라이선스
NAVER_SEARCHAD_SECRET_KEY=비밀키
NAVER_SEARCHAD_CUSTOMER_ID=계정번호
```

**3. 검증**
```bash
python3 scripts/naver_searchad.py GET /ncc/campaigns
```
`HTTP 200`이면 성공입니다. 빈 배열 `[]`은 **광고 미집행 계정**이라는 뜻이고 인증 자체는 정상입니다.

**인증 방식(참고)**: HMAC-SHA256 · 서명 `Base64(HMAC(SECRET, "{ms타임스탬프}.{METHOD}.{path}"))` · 헤더 `X-Timestamp·X-API-KEY·X-Customer·X-Signature`

---

## 자주 막히는 지점

| 증상 | 원인·해결 |
|---|---|
| 데이터랩 MCP가 빈 값/인증 오류 | `.env`에 `NAVER_CLIENT_ID/SECRET`이 없거나 오타. **SearchAd 키와 혼동 주의**(별개 인증) |
| 애플리케이션 등록했는데 트렌드가 안 나옴 | 사용 API에 **데이터랩 2종을 체크**하지 않음 → 애플리케이션 설정에서 추가 |
| SearchAd `HTTP 401` | `SECRET_KEY` 끝의 `==`까지 정확히 복사했는지 확인 |
| SearchAd `[]` 빈 결과 | 정상(광고 미집행). 인증 성공 상태 |
| 둘 중 뭘 써야 할지 모르겠음 | 트렌드·시장조사 = **데이터랩** / 광고비·ROAS = **검색광고** |

> 활용(시장 수요 리포트·브랜드 vs 일반 ROAS 분리 등)은 `skills/mcp설치-네이버` 스킬이 5단계로 안내합니다.
