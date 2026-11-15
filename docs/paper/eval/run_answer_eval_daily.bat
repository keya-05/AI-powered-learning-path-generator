@echo off
rem Daily slice of the RQ3 answer evaluation on the Gemini free tier (20 requests/day).
rem Resumes from answer_eval_cache.jsonl; stops by itself when the day's quota runs out.
cd /d "%~dp0..\..\.."
set PYTHONIOENCODING=utf-8
echo ===== %DATE% %TIME% ===== >> docs\paper\eval\answer_eval_daily.log
backend\venv\Scripts\python.exe -u docs\paper\eval\answer_eval.py --course HPC --sample 10 --scope-sample 5 --pause 4 >> docs\paper\eval\answer_eval_daily.log 2>&1
