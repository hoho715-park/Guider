#!/bin/bash
# ============================================
# 프롬프트 원문 자동 기록 훅 v1.1
# - IDE 자동 주입 태그(<ide_opened_file>) 필터링 포함
# ============================================

# stdin 으로 들어온 JSON 에서 프롬프트 원문 추출
INPUT=$(cat)

# 프롬프트 추출 후 IDE 자동 주입 태그 제거 (여러 줄 태그 대응)
PROMPT=$(echo "$INPUT" | jq -r '.prompt' | sed ':a;N;$!ba;s/<ide_opened_file>.*<\/ide_opened_file>//g' | sed '/^[[:space:]]*$/d')
SESSION=$(echo "$INPUT" | jq -r '.session_id' | cut -c1-8)

# 프로젝트 루트 기준 로그 폴더
LOG_DIR="$CLAUDE_PROJECT_DIR/dev-log"
mkdir -p "$LOG_DIR"

# 날짜별 파일에 기록
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).md"
TIMESTAMP=$(date '+%H:%M:%S')

{
  echo ""
  echo "## 🟦 [프롬프트] $TIMESTAMP (세션: $SESSION)"
  echo ""
  echo '```'
  echo "$PROMPT"
  echo '```'
} >> "$LOG_FILE"

exit 0