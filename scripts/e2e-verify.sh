#!/usr/bin/env bash
# Prep Pilot — full E2E verification.
#
# IMPORTANT sandbox constraints (learned the hard way):
#   1. Background processes are reaped between tool calls — the backend must
#      be started AND exercised within this single script invocation.
#   2. The local embedding model (~/.cache/chroma/onnx_models/all-MiniLM-L6-v2/)
#      must already be extracted, or chats block on a 79MB download.
#   3. CSS `uppercase` transforms affect Playwright text matching — wait for
#      "ANSWER SCORECARD", not "Answer scorecard".
#   4. `find text` misses buttons whose text sits next to icons; prefer refs
#      from a fresh snapshot (refs go stale after re-renders).
set -u
cd /home/z/my-project
S=scripts

ref() { # ref <pattern> — extract first ref matching an a11y snapshot line
  agent-browser snapshot -i 2>/dev/null | grep -E "$1" | grep -oE 'e[0-9]+' | head -1
}

echo "== [1] backend =="
(cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 > server.log 2>&1 &)
for i in $(seq 1 20); do curl -s -m 2 http://localhost:8000/api/health >/dev/null 2>&1 && break; sleep 1; done
curl -s -m 3 "http://localhost:81/api/health?XTransformPort=8000" >/dev/null && echo "gateway OK"

echo "== [2] fresh session =="
agent-browser set viewport 1440 900 >/dev/null
agent-browser open "http://localhost:81/" >/dev/null
agent-browser wait --text "Prep Pilot" --timeout 20000 >/dev/null 2>&1
agent-browser eval "localStorage.getItem('pp_view') !== 'app' ? localStorage.setItem('pp_view','app') : 'already app'" >/dev/null 2>&1
agent-browser reload >/dev/null
agent-browser wait --text "BACKEND ONLINE" --timeout 25000
agent-browser click "$(ref 'New session')" >/dev/null
agent-browser wait --text "Ready when you are" --timeout 15000
agent-browser screenshot $S/v2-app-online.png >/dev/null

echo "== [3] HR round =="
agent-browser click "$(ref 'Start an HR interview')" >/dev/null
agent-browser wait --text "HR COACH" --timeout 20000
agent-browser screenshot $S/v2-hr-question.png >/dev/null

echo "== [4] STAR answer -> scorecard =="
agent-browser find label "Chat message" fill "At FinPay I led the migration of our payments monolith to microservices. The situation was that deploys took 40 minutes and releases were quarterly. My task was to split the billing core without downtime. I designed a strangler-fig migration, built dual-write reconciliation, and ran weekly shadow comparisons for three months. The result: deploy time dropped to 4 minutes, release cadence became weekly, and we cut integration bugs by 60 percent." >/dev/null
agent-browser press Enter >/dev/null
agent-browser wait --text "ANSWER SCORECARD" --timeout 25000
sleep 2
agent-browser screenshot $S/v2-scorecard.png >/dev/null

echo "== [5] paste work experience =="
agent-browser click "$(ref 'button \"Paste\"')" >/dev/null
sleep 1
agent-browser eval "document.getElementById('paste-type').click()" >/dev/null 2>&1
sleep 1
agent-browser click "$(ref 'option \"Work ex\"')" >/dev/null
sleep 1
agent-browser find label "Pasted document text" fill "Senior Backend Engineer at FinPay 2021-2025. Led 6-person team migrating payments monolith to microservices with Go, Kubernetes and Kafka. Built dual-write reconciliation with zero-downtime cutover. Reduced deploy time from 40 minutes to 4 minutes, moved to weekly releases. Previously Backend Engineer at PayDesk 2018-2021 building fraud-detection pipelines in Python. BSc Computer Science, University of Lisbon." >/dev/null
agent-browser find label "Name (optional)" fill "finpay-workex.txt" >/dev/null
agent-browser click "$(ref 'Add to knowledge base')" >/dev/null
agent-browser wait --text "finpay-workex" --timeout 15000
sleep 1
agent-browser screenshot $S/v2-kb-workex.png >/dev/null

echo "== [6] paste job description =="
agent-browser click "$(ref 'button \"Paste\"')" >/dev/null
sleep 1
agent-browser eval "document.getElementById('paste-type').click()" >/dev/null 2>&1
sleep 1
agent-browser click "$(ref 'option \"Job\"')" >/dev/null
sleep 1
agent-browser find label "Pasted document text" fill "Senior Backend Engineer at PayFlow fintech. Requirements: 5+ years backend experience, deep knowledge of distributed systems, payment processing, Kubernetes, Go or Java. Own the microservices architecture, mentor engineers, drive reliability to 99.99 percent. Experience with Kafka event streaming and zero-downtime migrations strongly preferred." >/dev/null
agent-browser find label "Name (optional)" fill "payflow-jd.txt" >/dev/null
agent-browser click "$(ref 'Add to knowledge base')" >/dev/null
agent-browser wait --text "payflow-jd" --timeout 15000
sleep 1
agent-browser screenshot $S/v2-kb-full.png >/dev/null
agent-browser eval "'notProvided: ' + (document.body.innerText.match(/not provided yet/g)||[]).length"

echo "== [7] resume tailoring =="
agent-browser find label "Chat message" fill "Tailor my resume for the uploaded job description." >/dev/null
agent-browser press Enter >/dev/null
agent-browser wait --text "RESUME TAILOR" --timeout 25000
sleep 10
agent-browser screenshot $S/v2-resume-tailor.png >/dev/null

echo "== [8] mobile =="
agent-browser set viewport 390 844 >/dev/null
sleep 1
agent-browser screenshot $S/v2-mobile.png >/dev/null
agent-browser click "$(ref 'Open sidebar')" >/dev/null 2>&1
sleep 1
agent-browser screenshot $S/v2-mobile-drawer.png >/dev/null
agent-browser set viewport 1440 900 >/dev/null

echo "== [9] console =="
agent-browser errors 2>/dev/null | head -4
agent-browser console 2>/dev/null | grep -iE "error|warn" | head -5

pkill -f uvicorn
echo "DONE"
