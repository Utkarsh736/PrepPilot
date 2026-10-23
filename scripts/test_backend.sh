#!/bin/bash
# End-to-end smoke test for the Interview Copilot backend (demo mode)
set -e
BASE="http://127.0.0.1:8000/api"

echo "=== 1. Create session ==="
SESSION=$(curl -s -X POST $BASE/sessions | python3 -c "import sys,json; print(json.load(sys.stdin)['session_id'])")
echo "session: $SESSION"

echo ""
echo "=== 2. Upload resume (pasted text) ==="
RESUME='Sarah Chen — Senior Software Engineer
sarah.chen@email.com | linkedin.com/in/sarahchen | San Francisco, CA

EXPERIENCE
Senior Software Engineer @ FinPay (2021-2024)
- Led migration of monolith payments platform to microservices on Kubernetes, reducing deployment time 85% (3 days to 10 hours)
- Designed idempotent payment reconciliation service processing 2M transactions/day with 99.99% accuracy
- Mentored 4 junior engineers; introduced pair-programming rotation that cut onboarding time 40%

Software Engineer @ ShopLocal (2018-2021)
- Built real-time inventory sync service in Go and Kafka handling 50k events/second
- Reduced checkout p95 latency 40% through query optimization and Redis caching
- Owned CI/CD pipeline migration to GitHub Actions, cutting build times from 25 to 7 minutes

SKILLS
Languages: Python, Go, TypeScript, SQL
Infrastructure: Kubernetes, Docker, Terraform, AWS (EKS, Lambda, RDS)
Data: Kafka, Redis, PostgreSQL, Elasticsearch

EDUCATION
B.S. Computer Science, UC Berkeley, 2018'
curl -s -X POST $BASE/documents/text -H "Content-Type: application/json" -d "$(python3 -c "
import json,sys
print(json.dumps({'session_id':'$SESSION','doc_type':'resume','name':'sarah-chen-resume.txt','text':'''$RESUME'''}))
")" | python3 -c "import sys,json; d=json.load(sys.stdin); print('resume:', d['document']['word_count'], 'words,', d['document']['chunk_count'], 'chunks | flags:', d['flags'])"

echo ""
echo "=== 3. Upload job description ==="
JD='Senior Backend Engineer — Payments Platform
fintech startup, Series C, hybrid SF

We are building the payments infrastructure for marketplaces. You will own critical payment flows end-to-end.

Requirements:
- 5+ years backend experience with Python or Go
- Experience with distributed systems at scale (high-throughput, low-latency)
- Deep knowledge of microservices architecture and Kubernetes
- Experience with event streaming (Kafka or similar)
- Strong SQL and data modeling skills
- Track record of mentoring engineers

Nice to have: payments domain experience, Terraform, service mesh

Culture: ownership mindset, write things down, ship fast with high quality.'
curl -s -X POST $BASE/documents/text -H "Content-Type: application/json" -d "$(python3 -c "
import json,sys
print(json.dumps({'session_id':'$SESSION','doc_type':'job_description','name':'payments-jd.txt','text':'''$JD'''}))
")" | python3 -c "import sys,json; d=json.load(sys.stdin); print('jd:', d['document']['word_count'], 'words,', d['document']['chunk_count'], 'chunks | flags:', d['flags'])"

echo ""
echo "=== 4. Chat: start HR interview ==="
curl -s -X POST $BASE/chat -H "Content-Type: application/json" -d "$(python3 -c "
import json
print(json.dumps({'session_id':'$SESSION','message':'Help me prepare for my interview! Start an HR round.','mode':'auto'}))
")" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('intent:', d['intent'], '| type:', d['interview_type'], '| provider:', d['provider'], '| elapsed:', d['elapsed_s'], 's')
print('pipeline:', ' → '.join(p['label'] for p in d['pipeline']))
print('sources:', [s['name'] for s in d['sources']])
print('--- response (first 400 chars) ---')
print(d['response'][:400])
"

echo ""
echo "=== 5. Chat: answer the question ==="
curl -s -X POST $BASE/chat -H "Content-Type: application/json" -d "$(python3 -c "
import json
print(json.dumps({'session_id':'$SESSION','message':'I have been working in payments for the last 3 years at FinPay where I led the migration of our monolith to microservices on Kubernetes. The situation was that deployments took 3 days and releases were risky, so I was tasked with owning the migration of the payments platform. I designed the service boundaries, set up the CI/CD pipelines, and worked closely with 3 other engineers over 6 months. As a result deployment time dropped 85% from 3 days to 10 hours and incident count fell by half, which earned me the promotion to senior engineer.','mode':'hr'}))
")" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('intent:', d['intent'], '| elapsed:', d['elapsed_s'], 's')
ev = d.get('evaluation') or {}
print('evaluation overall:', ev.get('overall'), '| dims:', ev.get('dimensions'))
print('pipeline:', ' → '.join(p['label'] for p in d['pipeline']))
print('--- response (first 300 chars) ---')
print(d['response'][:300])
"

echo ""
echo "=== 6. Chat: tailor resume ==="
curl -s -X POST $BASE/chat -H "Content-Type: application/json" -d "$(python3 -c "
import json
print(json.dumps({'session_id':'$SESSION','message':'Now please tailor my resume for this job description','mode':'auto'}))
")" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('intent:', d['intent'], '| elapsed:', d['elapsed_s'], 's')
print('pipeline:', ' → '.join(p['label'] for p in d['pipeline']))
print('--- response (first 300 chars) ---')
print(d['response'][:300])
"

echo ""
echo "=== 7. Chat: general question (no context needed) ==="
curl -s -X POST $BASE/chat -H "Content-Type: application/json" -d "$(python3 -c "
import json
print(json.dumps({'session_id':'$SESSION','message':'How do I negotiate salary after getting an offer?','mode':'auto'}))
")" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('intent:', d['intent'], '| elapsed:', d['elapsed_s'], 's')
print('--- response (first 200 chars) ---')
print(d['response'][:200])
"

echo ""
echo "=== 8. Session state ==="
curl -s $BASE/sessions/$SESSION | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('messages:', len(d['messages']), '| docs:', len(d['documents']), '| flags:', d['flags'])
print('interview state:', {k: (len(v) if isinstance(v, list) else v) for k,v in d['interview'].items()})
"
