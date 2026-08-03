#!/usr/bin/env bash
# 매 사용자 프롬프트마다 "답변은 디스코드로" 규칙을 컨텍스트에 주입 (2026-08-04 사용자 지시)
cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"[상시 규칙 · 최우선] 이 세션의 모든 응답은 반드시 mcp__plugin_discord_discord__reply 툴로 해당 디스코드 채널(들어온 메시지의 chat_id)에 보낸다. 짧은 확인이든 긴 보고든 전부. 터미널/트랜스크립트 출력만으로 끝내지 마라 — 그건 대표께 닿지 않는다."}}
JSON
