import json
import unittest
from unittest.mock import patch
import httpx

from client_api.services.resume_chat import service
from client_api.services.resume_chat.providers import OllamaResumeLLMProvider, get_resume_llm_provider
from client_api.services.resume_chat.schemas import LLMResponse, ResumeChatRequest, ResumeRewriteBulletInput, ResumeRewriteSectionRequest


class FakeProvider:
    def __init__(self, text: str | list[str]):
        self.texts = text if isinstance(text, list) else [text]
        self.last_messages = None
        self.generate_calls = 0
        self.stream_calls = 0

    def _next_text(self, index: int) -> str:
        return self.texts[min(index, len(self.texts) - 1)]

    async def generate(self, *, system, messages, temperature=0.3, max_tokens=900, options=None):
        self.last_messages = messages
        text = self._next_text(self.generate_calls)
        self.generate_calls += 1
        return LLMResponse(text=text, raw={"ok": True})

    async def stream(self, *, system, messages, temperature=0.3, max_tokens=900, options=None):
        self.last_messages = messages
        text = self._next_text(self.stream_calls)
        self.stream_calls += 1
        yield text


class ResumeChatServiceTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.original_provider_factory = service.get_resume_llm_provider

    def tearDown(self):
        service.get_resume_llm_provider = self.original_provider_factory

    async def test_malformed_structured_json_degrades_to_chat_text(self):
        service.get_resume_llm_provider = lambda: FakeProvider("plain text, not json")

        response = await service.generate_resume_chat_response(
            ResumeChatRequest(
                message="Compare my resume against this job description and identify gaps.",
                resume_data={"fullName": "A", "experience": []},
            )
        )

        self.assertEqual(response.assistant_message, "plain text, not json")
        self.assertIsNone(response.analysis)
        self.assertIsNone(response.tailor_suggestions)

    async def test_tailor_discards_out_of_scope_and_unknown_bullets(self):
        provider = FakeProvider(
            """
            {
              "assistant_message": "Use tighter wording.",
              "tailor_suggestions": {
                "summary": [
                  {
                    "current_text": "Old summary",
                    "suggested_text": "New summary",
                    "reason": "Closer to the role."
                  }
                ],
                "skills": [
                  {
                    "suggested_text": "Add Kubernetes"
                  }
                ],
                "experience_bullets": [
                  {
                    "experience_id": "exp-1",
                    "role_title": "Engineer",
                    "bullet_index": 0,
                    "current_text": "Built APIs",
                    "suggested_text": "Built reliable APIs for production teams.",
                    "reason": "More specific impact."
                  },
                  {
                    "experience_id": "missing",
                    "role_title": "Other",
                    "bullet_index": 9,
                    "current_text": "Nope",
                    "suggested_text": "Nope",
                    "reason": "Out of scope."
                  }
                ]
              }
            }
            """
        )
        service.get_resume_llm_provider = lambda: provider

        response = await service.generate_resume_chat_response(
            ResumeChatRequest(
                message="Rewrite my professional summary and first work experience bullet for a backend role.",
                resume_data={
                    "summary": "Old summary",
                    "experience": [
                        {
                            "id": "exp-1",
                            "jobTitle": "Engineer",
                            "bullets": [{"id": "b-1", "text": "Built APIs"}],
                        }
                    ],
                    "skills": [{"category": "Skills", "items": ["Python"]}],
                },
            )
        )

        self.assertIsNotNone(response.tailor_suggestions)
        self.assertEqual(len(response.tailor_suggestions.summary), 1)
        self.assertEqual(len(response.tailor_suggestions.experience_bullets), 1)
        self.assertEqual(response.tailor_suggestions.experience_bullets[0].experience_id, "exp-1")
        self.assertEqual(response.tailor_suggestions.summary[0].suggested_text, "New summary")
        self.assertEqual(response.tailor_suggestions.experience_bullets[0].suggested_text, "Built APIs")
        self.assertIn("unsupported details", response.tailor_suggestions.experience_bullets[0].reason)

    async def test_request_message_is_capped_before_prompt_construction(self):
        provider = FakeProvider("ok")
        service.get_resume_llm_provider = lambda: provider

        await service.generate_resume_chat_response(
            ResumeChatRequest(
                message="x" * (service.MAX_MESSAGE_CHARS + 100),
                resume_data={"fullName": "A", "experience": []},
            )
        )

        self.assertIsNotNone(provider.last_messages)
        self.assertNotIn("x" * (service.MAX_MESSAGE_CHARS + 1), provider.last_messages[-1].content)

    async def test_casual_conversation_omits_resume_context(self):
        provider = FakeProvider("Hey, good to see you.")
        service.get_resume_llm_provider = lambda: provider

        response = await service.generate_resume_chat_response(
            ResumeChatRequest(
                message="Hey, how's it going?",
                resume_data={
                    "fullName": "A",
                    "summary": "Backend engineer",
                    "experience": [{"jobTitle": "Developer", "bullets": [{"text": "Built APIs"}]}],
                },
            )
        )

        self.assertEqual(response.intent, "conversation")
        self.assertIsNotNone(provider.last_messages)
        self.assertNotIn("Resume:", provider.last_messages[-1].content)
        self.assertNotIn("Backend engineer", provider.last_messages[-1].content)

    async def test_resume_conversation_keeps_resume_context(self):
        provider = FakeProvider("Your resume is clear overall.")
        service.get_resume_llm_provider = lambda: provider

        await service.generate_resume_chat_response(
            ResumeChatRequest(
                message="What do you think about my resume summary?",
                resume_data={
                    "fullName": "A",
                    "summary": "Backend engineer",
                    "experience": [{"jobTitle": "Developer", "bullets": [{"text": "Built APIs"}]}],
                },
            )
        )

        self.assertIsNotNone(provider.last_messages)
        self.assertIn("Optional resume context", provider.last_messages[-1].content)
        self.assertIn("Backend engineer", provider.last_messages[-1].content)


class ResumeChatProviderSelectionTests(unittest.TestCase):
    def test_provider_defaults_to_ollama_when_unconfigured(self):
        with patch.dict("os.environ", {}, clear=True):
            self.assertIsInstance(get_resume_llm_provider(), OllamaResumeLLMProvider)


class ResumeChatOptionsAndSanitizeTests(unittest.IsolatedAsyncioTestCase):
    def test_get_mode_options_defaults(self):
        with patch.dict("os.environ", {}, clear=True):
            ask_opts = service.get_mode_options("ask")
            self.assertEqual(ask_opts["temperature"], 0.35)
            self.assertEqual(ask_opts["num_predict"], 450)
            self.assertEqual(ask_opts["num_ctx"], 2048)
            self.assertEqual(ask_opts["top_k"], 30)

            tailor_opts = service.get_mode_options("tailor")
            self.assertEqual(tailor_opts["temperature"], 0.25)
            self.assertEqual(tailor_opts["num_predict"], 650)
            self.assertEqual(tailor_opts["num_ctx"], 2048)
            self.assertEqual(tailor_opts["top_k"], 30)

            analyze_opts = service.get_mode_options("analyze")
            self.assertEqual(analyze_opts["temperature"], 0.2)
            self.assertEqual(analyze_opts["num_predict"], 1000)
            self.assertEqual(analyze_opts["num_ctx"], 4096)
            self.assertEqual(analyze_opts["top_k"], 30)

    def test_get_mode_options_env_overrides(self):
        custom_env = {
            "RESUME_ASK_TEMPERATURE": "0.35",
            "RESUME_ASK_NUM_PREDICT": "500",
            "RESUME_ASK_NUM_CTX": "3072",
            "RESUME_ASK_TOP_K": "25",
        }
        with patch.dict("os.environ", custom_env):
            ask_opts = service.get_mode_options("ask")
            self.assertEqual(ask_opts["temperature"], 0.35)
            self.assertEqual(ask_opts["num_predict"], 500)
            self.assertEqual(ask_opts["num_ctx"], 3072)
            self.assertEqual(ask_opts["top_k"], 25)

    def test_sanitize_resume_data_pruning(self):
        full_resume = {
            "fullName": "Alice",
            "summary": "Full stack engineer",
            "experience": [
                {
                    "id": "exp-1",
                    "jobTitle": "Dev",
                    "company": "A",
                    "bullets": [{"id": "b1", "text": "Coding"}],
                }
            ],
            "education": [{"school": "MIT", "degree": "CS"}],
            "skills": [{"category": "Languages", "items": ["Python"]}],
        }

        # tailor suggestions should omit education and skills keys
        tailor_sanitized = service._sanitize_resume_data(full_resume, "tailor_suggestions")
        self.assertEqual(tailor_sanitized["fullName"], "Alice")
        self.assertEqual(tailor_sanitized["summary"], "Full stack engineer")
        self.assertEqual(len(tailor_sanitized["experience"]), 1)
        self.assertNotIn("education", tailor_sanitized)
        self.assertNotIn("skills", tailor_sanitized)

        # analysis should include education and skills keys
        analyze_sanitized = service._sanitize_resume_data(full_resume, "analysis")
        self.assertIn("education", analyze_sanitized)
        self.assertIn("skills", analyze_sanitized)
        self.assertEqual(len(analyze_sanitized["education"]), 1)
        self.assertEqual(len(analyze_sanitized["skills"]), 1)


class ResumeChatIntentTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.original_provider_factory = service.get_resume_llm_provider

    def tearDown(self):
        service.get_resume_llm_provider = self.original_provider_factory

    def test_intent_router_maps_analysis_prompts(self):
        self.assertEqual(
            service.infer_resume_chat_intent("Compare my resume to this job description and give me a match score."),
            "analysis",
        )
        self.assertEqual(
            service.infer_resume_chat_intent("What gaps do I have for this role?"),
            "analysis",
        )

    def test_intent_router_maps_tailor_prompts(self):
        self.assertEqual(
            service.infer_resume_chat_intent("Rewrite my summary and improve the first bullet."),
            "tailor_suggestions",
        )

    def test_intent_router_defaults_to_conversation(self):
        self.assertEqual(service.infer_resume_chat_intent("How do I tailor my resume?"), "conversation")
        self.assertEqual(service.infer_resume_chat_intent("What should I focus on in my job search?"), "conversation")

    def test_casual_conversation_detection(self):
        self.assertTrue(service.is_casual_conversation("Hey, how's it going?"))
        self.assertTrue(service.is_casual_conversation("thanks"))
        self.assertFalse(service.is_casual_conversation("Hey, can you review my resume?"))
        self.assertFalse(service.is_casual_conversation("How should I prepare for this interview?"))

    async def test_rewrite_suggestion_uses_only_provided_summary_context(self):
        provider = FakeProvider(
            """
            {
              "assistant_message": "I tightened the summary.",
              "tailor_suggestions": {
                "summary": [
                  {
                    "current_text": "Only this summary.",
                    "suggested_text": "Only this summary.",
                    "reason": "It is already concise."
                  }
                ],
                "experience_bullets": []
              }
            }
            """
        )
        service.get_resume_llm_provider = lambda: provider

        response = await service.generate_resume_rewrite_suggestion(
            ResumeRewriteSectionRequest(
                target="summary",
                summary_text="Only this summary.",
                guidance="Make it clearer.",
            )
        )

        self.assertEqual(response.tailor_suggestions.summary[0].suggested_text, "Only this summary.")
        self.assertIsNotNone(provider.last_messages)
        prompt = provider.last_messages[-1].content
        self.assertIn("Only this summary.", prompt)
        self.assertNotIn("Education", prompt)
        self.assertNotIn("Skills", prompt)

    async def test_rewrite_suggestion_malformed_json_uses_human_readable_message(self):
        raw_model_text = "# Welcome\n\n## Getting Started\n\nThis is not the reviewable rewrite schema."
        service.get_resume_llm_provider = lambda: FakeProvider(raw_model_text)

        response = await service.generate_resume_rewrite_suggestion(
            ResumeRewriteSectionRequest(
                target="summary",
                summary_text="Backend engineer focused on APIs.",
                guidance="Make it clearer.",
            )
        )

        self.assertEqual(response.assistant_message, service.UNSTRUCTURED_REWRITE_MESSAGE)
        self.assertNotIn("# Welcome", response.assistant_message)
        self.assertEqual(response.tailor_suggestions.summary, [])
        self.assertEqual(response.tailor_suggestions.experience_bullets, [])

    async def test_rewrite_suggestion_replaces_fabricated_experience_details_with_original_text(self):
        provider = FakeProvider(
            """
            {
              "assistant_message": "I rewrote the bullet.",
              "tailor_suggestions": {
                "summary": [],
                "experience_bullets": [
                  {
                    "experience_id": "exp-1",
                    "role_title": "Engineer",
                    "bullet_index": 0,
                    "current_text": "Built APIs.",
                    "suggested_text": "Built reliable APIs for core product workflows.",
                    "reason": "It clarifies scope."
                  }
                ]
              }
            }
            """
        )
        service.get_resume_llm_provider = lambda: provider

        response = await service.generate_resume_rewrite_suggestion(
            ResumeRewriteSectionRequest(
                target="experience",
                experience_id="exp-1",
                role_title="Engineer",
                company="Acme",
                bullets=[ResumeRewriteBulletInput(id="bullet-1", index=0, text="Built APIs.")],
                guidance="Make it clearer.",
            )
        )

        self.assertEqual(response.tailor_suggestions.experience_bullets[0].suggested_text, "Built APIs.")
        self.assertIn("unsupported details", response.tailor_suggestions.experience_bullets[0].reason)
        self.assertEqual(provider.generate_calls, 2)
        self.assertEqual(response.tailor_suggestions.summary, [])
        self.assertIsNotNone(provider.last_messages)
        prompt = provider.last_messages[-1].content
        self.assertIn("Retry because the previous rewrite was rejected", prompt)
        self.assertIn("Built APIs.", prompt)
        self.assertIn("XYZ-style", prompt)
        self.assertIn("action verb", prompt)
        self.assertIn("Do not invent the Y", prompt)
        self.assertIn("excessive buzzwords", prompt)
        self.assertIn("Prefer a smaller truthful rewrite", prompt)
        self.assertIn("independent source of facts", prompt)
        self.assertIn("do not borrow facts from other bullets", prompt)
        self.assertNotIn("Engineer", prompt)
        self.assertNotIn("Acme", prompt)
        self.assertNotIn("Professional Summary", prompt)
        self.assertNotIn("Education", prompt)
        self.assertNotIn("Skills", prompt)

    async def test_rewrite_suggestion_allows_source_bound_action_verb_rewrite(self):
        provider = FakeProvider(
            """
            {
              "assistant_message": "I tightened the bullet.",
              "tailor_suggestions": {
                "summary": [],
                "experience_bullets": [
                  {
                    "experience_id": "exp-1",
                    "role_title": "Engineer",
                    "bullet_index": 0,
                    "current_text": "Responsible for building APIs.",
                    "suggested_text": "Built APIs.",
                    "reason": "It starts with a direct action verb without adding facts."
                  }
                ]
              }
            }
            """
        )
        service.get_resume_llm_provider = lambda: provider

        response = await service.generate_resume_rewrite_suggestion(
            ResumeRewriteSectionRequest(
                target="experience",
                experience_id="exp-1",
                role_title="Engineer",
                company="Acme",
                bullets=[ResumeRewriteBulletInput(id="bullet-1", index=0, text="Responsible for building APIs.")],
                guidance="Make it clearer.",
            )
        )

        self.assertEqual(response.tailor_suggestions.experience_bullets[0].suggested_text, "Built APIs.")
        self.assertEqual(
            response.tailor_suggestions.experience_bullets[0].reason,
            "It starts with a direct action verb without adding facts.",
        )
        self.assertEqual(provider.generate_calls, 1)

    async def test_rewrite_suggestion_allows_low_risk_wording_improvements(self):
        provider = FakeProvider(
            """
            {
              "assistant_message": "I tightened the bullet.",
              "tailor_suggestions": {
                "summary": [],
                "experience_bullets": [
                  {
                    "experience_id": "exp-1",
                    "role_title": "Engineer",
                    "bullet_index": 0,
                    "current_text": "Responsible for building APIs.",
                    "suggested_text": "Built API endpoints.",
                    "reason": "It is more concise without adding scope or impact."
                  }
                ]
              }
            }
            """
        )
        service.get_resume_llm_provider = lambda: provider

        response = await service.generate_resume_rewrite_suggestion(
            ResumeRewriteSectionRequest(
                target="experience",
                experience_id="exp-1",
                role_title="Engineer",
                company="Acme",
                bullets=[ResumeRewriteBulletInput(id="bullet-1", index=0, text="Responsible for building APIs.")],
                guidance="Make it clearer.",
            )
        )

        self.assertEqual(provider.generate_calls, 1)
        self.assertEqual(response.tailor_suggestions.experience_bullets[0].suggested_text, "Built API endpoints.")

    async def test_rewrite_suggestion_rejects_soft_unsupported_bullet_claims(self):
        provider = FakeProvider(
            """
            {
              "assistant_message": "I made the bullet stronger.",
              "tailor_suggestions": {
                "summary": [],
                "experience_bullets": [
                  {
                    "experience_id": "exp-1",
                    "role_title": "Analyst",
                    "bullet_index": 0,
                    "current_text": "Created reports.",
                    "suggested_text": "Created insightful reports that improved decision-making.",
                    "reason": "It adds impact."
                  }
                ]
              }
            }
            """
        )
        service.get_resume_llm_provider = lambda: provider

        response = await service.generate_resume_rewrite_suggestion(
            ResumeRewriteSectionRequest(
                target="experience",
                experience_id="exp-1",
                role_title="Analyst",
                company="Acme",
                bullets=[ResumeRewriteBulletInput(id="bullet-1", index=0, text="Created reports.")],
                guidance="Make it clearer.",
            )
        )

        self.assertEqual(provider.generate_calls, 2)
        self.assertEqual(response.tailor_suggestions.experience_bullets[0].suggested_text, "Created reports.")
        self.assertIn("unsupported details", response.tailor_suggestions.experience_bullets[0].reason)

    async def test_rewrite_suggestion_retries_fabricated_output_with_grounded_guidance(self):
        provider = FakeProvider(
            [
                """
                {
                  "assistant_message": "I rewrote the bullet.",
                  "tailor_suggestions": {
                    "summary": [],
                    "experience_bullets": [
                      {
                        "experience_id": "exp-1",
                        "role_title": "Engineer",
                        "bullet_index": 0,
                        "current_text": "Responsible for building APIs.",
                        "suggested_text": "Built reliable APIs for production workflows.",
                        "reason": "It clarifies scope."
                      }
                    ]
                  }
                }
                """,
                """
                {
                  "assistant_message": "I tightened the bullet.",
                  "tailor_suggestions": {
                    "summary": [],
                    "experience_bullets": [
                      {
                        "experience_id": "exp-1",
                        "role_title": "Engineer",
                        "bullet_index": 0,
                        "current_text": "Responsible for building APIs.",
                        "suggested_text": "Built APIs.",
                        "reason": "It is concise and stays within the source text."
                      }
                    ]
                  }
                }
                """
            ]
        )
        service.get_resume_llm_provider = lambda: provider

        response = await service.generate_resume_rewrite_suggestion(
            ResumeRewriteSectionRequest(
                target="experience",
                experience_id="exp-1",
                role_title="Engineer",
                company="Acme",
                bullets=[ResumeRewriteBulletInput(id="bullet-1", index=0, text="Responsible for building APIs.")],
                guidance="Make it clearer.",
            )
        )

        self.assertEqual(provider.generate_calls, 2)
        self.assertEqual(response.tailor_suggestions.experience_bullets[0].suggested_text, "Built APIs.")
        self.assertEqual(
            response.tailor_suggestions.experience_bullets[0].reason,
            "It is concise and stays within the source text.",
        )

    async def test_stream_rewrite_suggestion_emits_draft_and_validated_structured_payload(self):
        provider = FakeProvider(
            """
            {
              "assistant_message": "I rewrote the bullet.",
              "tailor_suggestions": {
                "summary": [],
                "experience_bullets": [
                  {
                    "experience_id": "exp-1",
                    "role_title": "Engineer",
                    "bullet_index": 0,
                    "current_text": "Built APIs.",
                    "suggested_text": "Built reliable APIs for production workflows.",
                    "reason": "It clarifies scope."
                  }
                ]
              }
            }
            """
        )
        service.get_resume_llm_provider = lambda: provider

        chunks = [
            json.loads(chunk)
            async for chunk in service.stream_resume_rewrite_suggestion(
                ResumeRewriteSectionRequest(
                    target="experience",
                    experience_id="exp-1",
                    role_title="Engineer",
                    company="Acme",
                    bullets=[ResumeRewriteBulletInput(id="bullet-1", index=0, text="Built APIs.")],
                    guidance="Make it clearer.",
                )
            )
        ]

        self.assertTrue(any(event["event"] == "delta" and event["text"].startswith("Built reliable APIs") for event in chunks))
        structured = next(event for event in chunks if event["event"] == "structured")
        final_bullet = structured["tailor_suggestions"]["experience_bullets"][0]
        self.assertEqual(final_bullet["suggested_text"], "Built APIs.")
        self.assertIn("unsupported details", final_bullet["reason"])
        self.assertEqual(provider.stream_calls, 2)
        self.assertEqual(chunks[-1]["event"], "done")


class OllamaProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_ollama_provider_passes_options_and_keep_alive(self):
        provider = OllamaResumeLLMProvider()
        provider.base_url = "http://localhost:11434"
        provider.model = "qwen2.5:3b-instruct"

        mock_response = httpx.Response(
            status_code=200,
            json={"message": {"role": "assistant", "content": "Hello response"}},
            request=httpx.Request("POST", "http://localhost:11434/api/chat")
        )

        captured_json = None

        def mock_post(url, json=None, *args, **kwargs):
            nonlocal captured_json
            captured_json = json
            return mock_response

        # We mock client.post on httpx.AsyncClient
        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            response = await provider.generate(
                system="Test system",
                messages=[service.LLMMessage(role="user", content="Hello")],
                temperature=0.2,
                max_tokens=450,
                options={"num_ctx": 2048, "top_k": 20, "keep_alive": "30m"}
            )

            self.assertEqual(response.text, "Hello response")
            self.assertIsNotNone(captured_json)
            self.assertEqual(captured_json["keep_alive"], "30m")
            self.assertEqual(captured_json["options"]["num_ctx"], 2048)
            self.assertEqual(captured_json["options"]["top_k"], 20)
            self.assertEqual(captured_json["options"]["temperature"], 0.2)
            self.assertEqual(captured_json["options"]["num_predict"], 450)

    async def test_ollama_provider_unreachable_raises_exception(self):
        provider = OllamaResumeLLMProvider()
        provider.base_url = "http://localhost:11434"

        # Mocking connection error
        with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Connection refused")):
            from client_api.services.resume_chat.providers import ResumeLLMProviderUnavailable
            with self.assertRaises(ResumeLLMProviderUnavailable):
                await provider.generate(
                    system="System",
                    messages=[],
                )

    async def test_ollama_provider_missing_model_raises_exception(self):
        provider = OllamaResumeLLMProvider()
        provider.base_url = "http://localhost:11434"

        # Ollama returns 404 or 400 with model not found
        mock_response = httpx.Response(
            status_code=404,
            text="model not found",
            request=httpx.Request("POST", "http://localhost:11434/api/chat")
        )
        with patch("httpx.AsyncClient.post", return_value=mock_response):
            from client_api.services.resume_chat.providers import ResumeLLMProviderUnavailable
            with self.assertRaises(ResumeLLMProviderUnavailable):
                await provider.generate(
                    system="System",
                    messages=[],
                )

    async def test_ollama_provider_memory_error_has_setup_guidance(self):
        provider = OllamaResumeLLMProvider()
        provider.base_url = "http://localhost:11434"
        provider.model = "qwen2.5:3b-instruct"

        mock_response = httpx.Response(
            status_code=500,
            json={"error": "model requires more system memory (3.1 GiB) than is available (2.8 GiB)"},
            request=httpx.Request("POST", "http://localhost:11434/api/chat"),
        )
        with patch("httpx.AsyncClient.post", return_value=mock_response):
            from client_api.services.resume_chat.providers import ResumeLLMProviderUnavailable
            with self.assertRaises(ResumeLLMProviderUnavailable) as raised:
                await provider.generate(
                    system="System",
                    messages=[],
                )

        self.assertIn("needs more memory", str(raised.exception))
        self.assertIn("qwen2.5:1.5b", str(raised.exception))


if __name__ == "__main__":
    unittest.main()
