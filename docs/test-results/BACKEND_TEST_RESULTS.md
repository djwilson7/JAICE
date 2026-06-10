# Pytest Backend Coverage Report

## Summary
| Metric | Coverage |
| :--- | :--- |
| **Statements** | 97.53% (4818/4940) |
| **Branches** | 96.72% (1240/1282) |
| **Functions** | 97.95% (335/342) |
| **Lines** | 97.53% (4818/4940) |

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
| client_api/api/resume.py | 98.57 | 97.06 | 100 | 98.57 | 49-50, 1615, 1620-1621, 1626-1627, 1635 |
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
| client_api/services/supabase_client.py | 100 | 100 | 100 | 100 |  |
| client_api/utils/task_definitions.py | 100 | 100 | 100 | 100 |  |
| common/email_text.py | 100 | 100 | 100 | 100 |  |
| common/job_application_crypto.py | 100 | 100 | 100 | 100 |  |
| common/logger.py | 100 | 100 | 100 | 100 |  |
| common/security.py | 100 | 100 | 100 | 100 |  |
| gmail/gmail_queries.py | 100 | 100 | 100 | 100 |  |
| gmail/gmail_tasks.py | 87.53 | 83.87 | 95 | 87.53 | 56, 60, 72-80, 91-102, 132-133, 136, 142-143, 150, 171, 196-197, 226, 228-231, 242-251, 262-266, 464, 691-693, 719, 801-802, 817 |
| gmail/gmail_worker.py | 100 | 100 | 100 | 100 |  |
| gmail/pubsub_listener.py | 70.73 | 100 | 71.43 | 70.73 | 51-52, 57, 92-94, 103-108, 111-112, 115-117, 120, 122-125, 127-128 |
| shared_worker_library/celery_app.py | 100 | 100 | 100 | 100 |  |
| shared_worker_library/database.py | 100 | 100 | 100 | 100 |  |
| shared_worker_library/db_queries/job_application_queries.py | 100 | 100 | 100 | 100 |  |
| shared_worker_library/db_queries/std_queries.py | 100 | 100 | 100 | 100 |  |
| shared_worker_library/db_queries/transfer_query.py | 100 | 100 | 100 | 100 |  |
| shared_worker_library/utils/task_definitions.py | 100 | 100 | 100 | 100 |  |
| shared_worker_library/utils/to_bytes.py | 100 | 100 | 100 | 100 |  |
