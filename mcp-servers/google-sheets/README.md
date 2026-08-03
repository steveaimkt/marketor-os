# mcp-servers/google-sheets — Google Sheets 전용 MCP 서버

자체 호스팅 OAuth2 서버입니다 (10개 도구). `.mcp.json` 의 `google-sheets` 항목이
`mcp-servers/google-sheets/index.js` 를 실행합니다.

## 자체 호스팅 서버는 이것 하나뿐입니다

| 폴더 | 담당 | 왜 자체 호스팅인가 |
|---|---|---|
| `mcp-servers/google-sheets/` | 구글 시트 | OAuth2 흐름을 직접 쥐어야 해서 |

나머지 MCP(GA4·YouTube·Notion·Discord 등)는 `.mcp.json` 에서 npx 로 직접 실행됩니다.
설치·키 발급 절차는 `mcp-setup/` 을 보세요.

## 자격 증명

`oauth_credentials.json` · `token.json` 은 **커밋하지 않습니다** (`.gitignore`).
발급 절차는 `mcp-setup/google-sheets/SKILL.md` 또는 「Google Sheets MCP 설치하자」.
