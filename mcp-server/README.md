# mcp-server — Google Sheets 전용 MCP 서버

⚠️ 폴더 이름은 범용이지만 **이 서버는 Google Sheets 하나만 담당**합니다 (자체 호스팅 OAuth2 · 10개 도구).
`.mcp.json`의 `google-sheets` 항목이 `mcp-server/index.js`를 가리킵니다.

다른 MCP(GA4·YouTube·네이버 등)는 여기 없습니다 — 전부 `.mcp.json`에서 npx로 직접 실행됩니다.

> 폴더명을 바꾸지 않는 이유: Part 2 강의 실습 문서·설치 스킬 수십 곳이 `mcp-server/` 경로를 참조합니다.

- 인증 파일: `oauth_credentials.json`(최초 발급) · `token.json`(자동 생성·갱신) — 둘 다 gitignore
- 상세 설치: `/mcp설치-google-sheets` 스킬 또는 `curriculum/part02-MCP12개/01-google-sheets/`
