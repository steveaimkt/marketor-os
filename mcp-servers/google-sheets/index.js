#!/usr/bin/env node

/**
 * Google Sheets MCP Server (stdio transport)
 * - OAuth2 데스크톱 플로우로 인증
 * - Google Sheets 읽기/쓰기 도구 제공
 */

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { exec } = require("child_process");

// ── 설정 ──
const CREDENTIALS_PATH = path.join(__dirname, "oauth_credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const REDIRECT_PORT = 3456;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

// ── OAuth2 인증 ──
async function getAuthClient() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`OAuth 자격증명 파일이 없습니다: ${CREDENTIALS_PATH}`);
  }

  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
  const { client_id, client_secret } = creds.installed || creds.web || {};

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

  // 저장된 토큰이 있으면 사용
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));

    // 스코프 확인 - spreadsheets (not readonly) 포함 여부
    const hasWriteScope =
      token.scopes &&
      token.scopes.some((s) => s === "https://www.googleapis.com/auth/spreadsheets");

    if (hasWriteScope || (token.scope && token.scope.includes("spreadsheets") && !token.scope.includes("readonly"))) {
      oauth2Client.setCredentials(token);

      // 토큰 갱신 이벤트 핸들러
      oauth2Client.on("tokens", (newTokens) => {
        const merged = { ...token, ...newTokens };
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
      });

      return oauth2Client;
    }
    // readonly 스코프만 있으면 새 토큰 필요
    console.error("[MCP] 기존 토큰이 readonly 스코프만 가지고 있어 새 인증이 필요합니다.");
  }

  // 새 토큰 획득 (브라우저 플로우)
  const token = await getNewToken(oauth2Client);
  oauth2Client.setCredentials(token);

  oauth2Client.on("tokens", (newTokens) => {
    const merged = { ...token, ...newTokens };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
  });

  return oauth2Client;
}

function getNewToken(oauth2Client) {
  return new Promise((resolve, reject) => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });

    // 로컬 서버로 콜백 수신
    const server = http.createServer(async (req, res) => {
      if (!req.url.startsWith("/callback")) return;

      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      const code = url.searchParams.get("code");

      if (!code) {
        res.writeHead(400);
        res.end("인증 코드가 없습니다.");
        server.close();
        reject(new Error("No auth code"));
        return;
      }

      try {
        const { tokens } = await oauth2Client.getToken(code);
        tokens.scopes = SCOPES;
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>✅ 인증 완료!</h1><p>이 창을 닫아도 됩니다.</p>");
        server.close();
        resolve(tokens);
      } catch (err) {
        res.writeHead(500);
        res.end("토큰 교환 실패: " + err.message);
        server.close();
        reject(err);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.error(`[MCP] 브라우저에서 인증해주세요:\n${authUrl}`);
      // 크로스플랫폼 브라우저 열기 (macOS / Windows / Linux)
      const opener =
        process.platform === "darwin" ? "open" :
        process.platform === "win32" ? "start \"\"" :
        "xdg-open";
      exec(`${opener} "${authUrl}"`, (err) => {
        if (err) {
          console.error(`[MCP] 브라우저 자동 열기 실패. 위 URL 을 수동으로 열어주세요.`);
        }
      });
    });

    // 5분 타임아웃
    setTimeout(() => {
      server.close();
      reject(new Error("인증 타임아웃 (5분)"));
    }, 300000);
  });
}

// ── Sheets API 헬퍼 ──
function getSheetsApi(auth) {
  return google.sheets({ version: "v4", auth });
}

// ── MCP 서버 생성 ──
async function main() {
  const auth = await getAuthClient();
  const sheets = getSheetsApi(auth);

  const server = new McpServer({
    name: "google-sheets",
    version: "1.0.0",
  });

  // ═══ Tool 1: 스프레드시트 정보 조회 ═══
  server.tool(
    "get_spreadsheet_info",
    "스프레드시트의 기본 정보와 시트 목록을 조회합니다",
    { spreadsheet_id: z.string().describe("스프레드시트 ID") },
    async ({ spreadsheet_id }) => {
      try {
        const res = await sheets.spreadsheets.get({
          spreadsheetId: spreadsheet_id,
          fields: "properties.title,sheets.properties",
        });
        const info = {
          title: res.data.properties.title,
          sheets: res.data.sheets.map((s) => ({
            title: s.properties.title,
            sheetId: s.properties.sheetId,
            rowCount: s.properties.gridProperties.rowCount,
            columnCount: s.properties.gridProperties.columnCount,
          })),
        };
        return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `오류: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ Tool 2: 셀 범위 읽기 ═══
  server.tool(
    "read_sheet",
    "스프레드시트에서 지정 범위의 데이터를 읽습니다",
    {
      spreadsheet_id: z.string().describe("스프레드시트 ID"),
      range: z.string().describe("읽을 범위 (예: '시트1!A1:K100' 또는 '시트1')"),
    },
    async ({ spreadsheet_id, range }) => {
      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: spreadsheet_id,
          range,
        });
        const data = {
          range: res.data.range,
          rowCount: res.data.values ? res.data.values.length : 0,
          values: res.data.values || [],
        };
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `오류: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ Tool 3: 셀 범위 쓰기 ═══
  server.tool(
    "write_sheet",
    "스프레드시트의 지정 범위에 데이터를 씁니다 (기존 데이터 덮어쓰기)",
    {
      spreadsheet_id: z.string().describe("스프레드시트 ID"),
      range: z.string().describe("쓸 범위 (예: '시트1!A1:C3')"),
      values: z.array(z.array(z.any())).describe("2차원 배열 데이터 [[row1], [row2], ...]"),
    },
    async ({ spreadsheet_id, range, values }) => {
      try {
        const res = await sheets.spreadsheets.values.update({
          spreadsheetId: spreadsheet_id,
          range,
          valueInputOption: "USER_ENTERED",
          requestBody: { values },
        });
        return {
          content: [
            {
              type: "text",
              text: `${res.data.updatedRows}행 ${res.data.updatedColumns}열 업데이트 완료 (범위: ${res.data.updatedRange})`,
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `오류: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ Tool 4: 행 추가 (append) ═══
  server.tool(
    "append_sheet",
    "스프레드시트의 데이터 끝에 새 행을 추가합니다",
    {
      spreadsheet_id: z.string().describe("스프레드시트 ID"),
      range: z.string().describe("추가할 시트 범위 (예: '시트1!A:K')"),
      values: z.array(z.array(z.any())).describe("추가할 행 데이터 [[row1], [row2], ...]"),
    },
    async ({ spreadsheet_id, range, values }) => {
      try {
        const res = await sheets.spreadsheets.values.append({
          spreadsheetId: spreadsheet_id,
          range,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values },
        });
        return {
          content: [
            {
              type: "text",
              text: `${res.data.updates.updatedRows}행 추가 완료 (범위: ${res.data.updates.updatedRange})`,
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `오류: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ Tool 5: 범위 클리어 ═══
  server.tool(
    "clear_sheet",
    "스프레드시트의 지정 범위 데이터를 삭제합니다",
    {
      spreadsheet_id: z.string().describe("스프레드시트 ID"),
      range: z.string().describe("삭제할 범위 (예: '시트1!A2:K1000')"),
    },
    async ({ spreadsheet_id, range }) => {
      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: spreadsheet_id,
          range,
        });
        return { content: [{ type: "text", text: `범위 ${range} 클리어 완료` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `오류: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ Tool 6: 새 시트 탭 추가 ═══
  server.tool(
    "add_sheet",
    "스프레드시트에 새 시트 탭을 추가합니다",
    {
      spreadsheet_id: z.string().describe("스프레드시트 ID"),
      title: z.string().describe("새 시트 이름"),
    },
    async ({ spreadsheet_id, title }) => {
      try {
        const res = await sheets.spreadsheets.batchUpdate({
          spreadsheetId: spreadsheet_id,
          requestBody: {
            requests: [{ addSheet: { properties: { title } } }],
          },
        });
        const newSheet = res.data.replies[0].addSheet.properties;
        return {
          content: [
            {
              type: "text",
              text: `시트 "${newSheet.title}" 추가 완료 (sheetId: ${newSheet.sheetId})`,
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `오류: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ Tool 7: 시트 탭 삭제 ═══
  server.tool(
    "delete_sheet",
    "스프레드시트에서 시트 탭을 삭제합니다",
    {
      spreadsheet_id: z.string().describe("스프레드시트 ID"),
      sheet_id: z.number().describe("삭제할 시트 ID (숫자)"),
    },
    async ({ spreadsheet_id, sheet_id }) => {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: spreadsheet_id,
          requestBody: {
            requests: [{ deleteSheet: { sheetId: sheet_id } }],
          },
        });
        return { content: [{ type: "text", text: `시트(ID: ${sheet_id}) 삭제 완료` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `오류: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ Tool 8: 여러 범위 한번에 읽기 ═══
  server.tool(
    "batch_read_sheet",
    "여러 범위의 데이터를 한번에 읽습니다",
    {
      spreadsheet_id: z.string().describe("스프레드시트 ID"),
      ranges: z.array(z.string()).describe("읽을 범위 목록 (예: ['시트1!A1:C10', '시트1!E1:F10'])"),
    },
    async ({ spreadsheet_id, ranges }) => {
      try {
        const res = await sheets.spreadsheets.values.batchGet({
          spreadsheetId: spreadsheet_id,
          ranges,
        });
        const results = res.data.valueRanges.map((vr) => ({
          range: vr.range,
          rowCount: vr.values ? vr.values.length : 0,
          values: vr.values || [],
        }));
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `오류: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ Tool 9: 새 스프레드시트 생성 ═══
  server.tool(
    "create_spreadsheet",
    "새 Google 스프레드시트를 생성합니다",
    {
      title: z.string().describe("스프레드시트 제목"),
      sheet_titles: z.array(z.string()).optional().describe("시트 탭 이름 목록 (선택)"),
    },
    async ({ title, sheet_titles }) => {
      try {
        const requestBody = {
          properties: { title },
        };
        if (sheet_titles && sheet_titles.length > 0) {
          requestBody.sheets = sheet_titles.map((t) => ({
            properties: { title: t },
          }));
        }
        const res = await sheets.spreadsheets.create({ requestBody });
        return {
          content: [
            {
              type: "text",
              text: `스프레드시트 생성 완료\n제목: ${res.data.properties.title}\nID: ${res.data.spreadsheetId}\nURL: ${res.data.spreadsheetUrl}`,
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `오류: ${err.message}` }], isError: true };
      }
    }
  );

  // ═══ Tool 10: 서식 및 스타일 적용 ═══
  server.tool(
    "format_cells",
    "셀에 서식(배경색, 굵기, 정렬 등)을 적용합니다",
    {
      spreadsheet_id: z.string().describe("스프레드시트 ID"),
      sheet_id: z.number().describe("시트 ID (숫자)"),
      start_row: z.number().describe("시작 행 인덱스 (0부터)"),
      end_row: z.number().describe("종료 행 인덱스"),
      start_col: z.number().describe("시작 열 인덱스 (0부터)"),
      end_col: z.number().describe("종료 열 인덱스"),
      bold: z.boolean().optional().describe("굵게"),
      background_color: z.string().optional().describe("배경색 (hex, 예: '#4285f4')"),
      font_color: z.string().optional().describe("글자색 (hex)"),
      font_size: z.number().optional().describe("글자 크기"),
      horizontal_alignment: z.enum(["LEFT", "CENTER", "RIGHT"]).optional().describe("수평 정렬"),
    },
    async ({ spreadsheet_id, sheet_id, start_row, end_row, start_col, end_col, bold, background_color, font_color, font_size, horizontal_alignment }) => {
      try {
        const cellFormat = {};
        const fields = [];

        if (bold !== undefined) {
          cellFormat.textFormat = { ...cellFormat.textFormat, bold };
          fields.push("userEnteredFormat.textFormat.bold");
        }
        if (font_size !== undefined) {
          cellFormat.textFormat = { ...cellFormat.textFormat, fontSize: font_size };
          fields.push("userEnteredFormat.textFormat.fontSize");
        }
        if (background_color) {
          const hex = background_color.replace("#", "");
          cellFormat.backgroundColor = {
            red: parseInt(hex.substring(0, 2), 16) / 255,
            green: parseInt(hex.substring(2, 4), 16) / 255,
            blue: parseInt(hex.substring(4, 6), 16) / 255,
          };
          fields.push("userEnteredFormat.backgroundColor");
        }
        if (font_color) {
          const hex = font_color.replace("#", "");
          cellFormat.textFormat = {
            ...cellFormat.textFormat,
            foregroundColorStyle: {
              rgbColor: {
                red: parseInt(hex.substring(0, 2), 16) / 255,
                green: parseInt(hex.substring(2, 4), 16) / 255,
                blue: parseInt(hex.substring(4, 6), 16) / 255,
              },
            },
          };
          fields.push("userEnteredFormat.textFormat.foregroundColorStyle");
        }
        if (horizontal_alignment) {
          cellFormat.horizontalAlignment = horizontal_alignment;
          fields.push("userEnteredFormat.horizontalAlignment");
        }

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: spreadsheet_id,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: { sheetId: sheet_id, startRowIndex: start_row, endRowIndex: end_row, startColumnIndex: start_col, endColumnIndex: end_col },
                  cell: { userEnteredFormat: cellFormat },
                  fields: fields.join(","),
                },
              },
            ],
          },
        });
        return { content: [{ type: "text", text: `서식 적용 완료 (행 ${start_row}-${end_row}, 열 ${start_col}-${end_col})` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `오류: ${err.message}` }], isError: true };
      }
    }
  );

  // ── stdio 트랜스포트로 시작 ──
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP] Google Sheets MCP 서버 시작됨 (stdio)");
}

main().catch((err) => {
  console.error("[MCP] 서버 시작 실패:", err);
  process.exit(1);
});
