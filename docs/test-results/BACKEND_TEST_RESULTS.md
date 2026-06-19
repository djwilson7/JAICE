# Pytest Backend Coverage Report

## Summary
| Metric | Coverage |
| :--- | :--- |
| **Statements** | 98.58% (5127/5201) |
| **Branches** | 97.01% (1298/1338) |
| **Functions** | 97.88% (370/378) |
| **Lines** | 98.58% (5127/5201) |

## Detailed Coverage

| Name | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s |
| :--- | :--- | :--- | :--- | :--- | :--- |
| classification/class_norm.py | 100 | 100 | 100 | 100 |  |
| classification/class_queries.py | 100 | 100 | 100 | 100 |  |
| classification/class_rules.py | 98.11 | 95.54 | 97.22 | 98.11 | 937-940, 978, 985, 1339 |
| classification/class_tasks.py | 96.27 | 91.49 | 100 | 96.27 | 362-364, 551, 554-559, 561 |
| classification/class_worker.py | 100 | 100 | 100 | 100 |  |
| classification/llm_classifier.py | 100 | 100 | 100 | 100 |  |
| client_api/api/auth_api.py | 96.25 | 88.64 | 88.24 | 96.25 | 53, 55, 60-61, 341, 390-393, 561-562, 682 |
| client_api/api/dashboard.py | 100 | 100 | 100 | 100 |  |
| client_api/api/gmail.py | 100 | 100 | 100 | 100 |  |
| client_api/api/jobs.py | 100 | 100 | 100 | 100 |  |
| client_api/api/resume.py | 95.63 | 92.86 | 89.47 | 95.63 | 58-59, 368, 397, 401-405, 409, 947-948, 979, 1019-1021, 1370, 1375-1376, 1381-1382, 1390 |
| client_api/db/apply_baseline_to_new_supabase.py | 100 | 94.44 | 100 | 100 |  |
| client_api/db/export_current_schema.py | 100 | 100 | 100 | 100 |  |
| client_api/db/migration_env.py | 100 | 100 | 100 | 100 |  |
| client_api/deps/auth.py | 100 | 100 | 100 | 100 |  |
| client_api/main.py | 100 | 100 | 100 | 100 |  |
| client_api/services/firebase_admin.py | 100 | 100 | 100 | 100 |  |
| client_api/services/resume_chat/prompts.py | 100 | 100 | 100 | 100 |  |
| client_api/services/resume_chat/providers.py | 100 | 100 | 100 | 100 |  |
| client_api/services/resume_chat/schemas.py | 100 | 100 | 100 | 100 |  |
| client_api/services/resume_chat/service.py | 100 | 100 | 100 | 100 |  |
| client_api/services/resume_pdf/fonts.py | 100 | 100 | 100 | 100 |  |
| client_api/services/resume_pdf/formatting.py | 100 | 100 | 100 | 100 |  |
| client_api/services/resume_pdf/generation.py | 100 | 75 | 100 | 100 |  |
| client_api/services/resume_pdf/model.py | 100 | 100 | 100 | 100 |  |
| client_api/services/resume_pdf/renderer.py | 98.8 | 97.22 | 100 | 98.8 | 46 |
| client_api/services/supabase_client.py | 100 | 100 | 100 | 100 |  |
| client_api/utils/task_definitions.py | 100 | 100 | 100 | 100 |  |
| common/email_text.py | 100 | 100 | 100 | 100 |  |
| common/job_application_crypto.py | 100 | 100 | 100 | 100 |  |
| common/logger.py | 100 | 100 | 100 | 100 |  |
| common/resume_render/spec.py | 100 | 100 | 100 | 100 |  |
| common/security.py | 100 | 100 | 100 | 100 |  |
| gmail/gmail_queries.py | 100 | 100 | 100 | 100 |  |
| gmail/gmail_tasks.py | 95.63 | 89.52 | 97.5 | 95.63 | 93-95, 228-231, 250, 262-266, 464, 691-693, 719, 801-802, 817 |
| gmail/gmail_worker.py | 100 | 100 | 100 | 100 |  |
| gmail/pubsub_listener.py | 100 | 100 | 100 | 100 |  |
| shared_worker_library/celery_app.py | 100 | 100 | 100 | 100 |  |
| shared_worker_library/database.py | 100 | 100 | 100 | 100 |  |
| shared_worker_library/db_queries/job_application_queries.py | 100 | 100 | 100 | 100 |  |
| shared_worker_library/db_queries/std_queries.py | 100 | 100 | 100 | 100 |  |
| shared_worker_library/db_queries/transfer_query.py | 100 | 100 | 100 | 100 |  |
| shared_worker_library/utils/task_definitions.py | 100 | 100 | 100 | 100 |  |
| shared_worker_library/utils/to_bytes.py | 100 | 100 | 100 | 100 |  |
