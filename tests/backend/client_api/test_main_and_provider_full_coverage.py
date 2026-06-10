from __future__ import annotations

import builtins
import sys
from collections import deque
from types import ModuleType, SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException

from client_api import main
from client_api.services.resume_chat import providers
from client_api.services.resume_chat.schemas import LLMMessage


class _MainResponse:
    def __init__(self, status_code=200, data=None, text="error"):
        self.status_code = status_code
        self._data = data or {}
        self.text = text

    def json(self):
        return self._data


class _MainClient:
    def __init__(self, result):
        self.result = result

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def get(self, *_args, **_kwargs):
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


@pytest.mark.asyncio
async def test_main_lifespan_success_and_empty_pool_shutdown(monkeypatch):
    initialized = []
    closed = []
    redis_calls = []
    pool = object()

    monkeypatch.setattr(main, "initialize_firebase_sdk", lambda: initialized.append(True))

    async def connect():
        return pool

    async def close():
        closed.append(True)

    monkeypatch.setattr(main, "connect_to_db", connect)
    monkeypatch.setattr(main, "close_db_connection", close)
    monkeypatch.setattr(
        main.redis,
        "from_url",
        lambda url, decode_responses: redis_calls.append((url, decode_responses)) or object(),
    )
    monkeypatch.setenv("CELERY_BROKER_URL_LOCAL", "redis://local")
    monkeypatch.setenv("CELERY_BROKER_URL_PROD", "redis://prod")
    app = SimpleNamespace(state=SimpleNamespace())

    async with main.lifespan(app):
        assert app.state.pool is pool
        assert app.state.redis is not None
        assert closed == []

    assert initialized == [True]
    assert redis_calls == [("redis://local", True)]
    assert closed == [True]

    async def connect_empty():
        return None

    monkeypatch.setattr(main, "connect_to_db", connect_empty)
    async with main.lifespan(SimpleNamespace(state=SimpleNamespace())):
        pass
    assert closed == [True]


@pytest.mark.asyncio
@pytest.mark.parametrize("failure", ["firebase", "database", "redis"])
async def test_main_lifespan_startup_failures(monkeypatch, failure):
    async def connect():
        if failure == "database":
            raise RuntimeError("database down")
        return object()

    monkeypatch.setattr(
        main,
        "initialize_firebase_sdk",
        lambda: (_ for _ in ()).throw(RuntimeError("firebase down")) if failure == "firebase" else None,
    )
    monkeypatch.setattr(main, "connect_to_db", connect)
    monkeypatch.setattr(
        main.redis,
        "from_url",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("redis down"))
        if failure == "redis"
        else object(),
    )

    with pytest.raises(RuntimeError, match=f"{failure.split('base')[0]}"):
        async with main.lifespan(SimpleNamespace(state=SimpleNamespace())):
            pass


@pytest.mark.asyncio
async def test_main_gmail_message_list_paths(monkeypatch):
    with pytest.raises(HTTPException) as missing:
        await main.get_gmail_messages(authorization=None)
    assert missing.value.status_code == 401

    with pytest.raises(HTTPException) as malformed:
        await main.get_gmail_messages(authorization="Basic token")
    assert malformed.value.status_code == 401

    responses = deque(
        [
            _MainResponse(data={"messages": [{"id": "m1"}]}),
            _MainResponse(status_code=403),
            httpx.ConnectError("offline"),
        ]
    )
    monkeypatch.setattr(main.httpx, "AsyncClient", lambda: _MainClient(responses.popleft()))

    assert await main.get_gmail_messages(2, "Bearer token") == {"messages": [{"id": "m1"}]}
    with pytest.raises(HTTPException) as denied:
        await main.get_gmail_messages(authorization="Bearer token")
    assert denied.value.status_code == 403
    with pytest.raises(HTTPException) as offline:
        await main.get_gmail_messages(authorization="Bearer token")
    assert offline.value.status_code == 500


@pytest.mark.asyncio
async def test_main_gmail_single_message_paths(monkeypatch):
    with pytest.raises(HTTPException) as missing:
        await main.get_gmail_message("m1", authorization=None)
    assert missing.value.status_code == 401

    with pytest.raises(HTTPException) as malformed:
        await main.get_gmail_message("m1", authorization="Basic token")
    assert malformed.value.status_code == 401

    responses = deque(
        [
            _MainResponse(data={"id": "m1"}),
            _MainResponse(status_code=404),
            httpx.ReadError("offline"),
        ]
    )
    monkeypatch.setattr(main.httpx, "AsyncClient", lambda: _MainClient(responses.popleft()))

    assert await main.get_gmail_message("m1", "Bearer token") == {"id": "m1"}
    with pytest.raises(HTTPException) as missing_message:
        await main.get_gmail_message("m1", "Bearer token")
    assert missing_message.value.status_code == 404
    with pytest.raises(HTTPException) as offline:
        await main.get_gmail_message("m1", "Bearer token")
    assert offline.value.status_code == 500


@pytest.mark.asyncio
async def test_main_health_paths(monkeypatch):
    assert main.check_app_liveness() == {"status": "ok", "detail": "Application process is running"}
    assert main.alive_check().status_code == 200

    async def healthy_db():
        return {"status": "ok"}

    async def unhealthy_db():
        raise HTTPException(status_code=503, detail={"status": "down"})

    async def healthy_auth():
        return True

    async def unhealthy_auth():
        raise HTTPException(status_code=503, detail="auth down")

    monkeypatch.setattr(main, "check_db_pool_status", healthy_db)
    monkeypatch.setattr(main, "check_firebase_auth_health", healthy_auth)
    assert (await main.db_alive_check()).status_code == 200
    assert (await main.auth_alive_check()).status_code == 200

    monkeypatch.setattr(main, "check_db_pool_status", unhealthy_db)
    monkeypatch.setattr(main, "check_firebase_auth_health", unhealthy_auth)
    assert (await main.db_alive_check()).status_code == 503
    assert (await main.auth_alive_check()).status_code == 503


class _OllamaResponse:
    def __init__(self, status_code=200, *, text="", data=None, lines=None, raise_error=None):
        self.status_code = status_code
        self.text = text
        self._data = data if data is not None else {"message": {"content": " answer "}}
        self._lines = lines or []
        self._raise_error = raise_error

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def aread(self):
        return self.text.encode()

    async def aiter_lines(self):
        for line in self._lines:
            yield line

    def json(self):
        if isinstance(self._data, Exception):
            raise self._data
        return self._data

    def raise_for_status(self):
        if self._raise_error:
            raise self._raise_error


class _OllamaClient:
    def __init__(self, result, calls):
        self.result = result
        self.calls = calls

    async def __aenter__(self):
        if isinstance(self.result, Exception):
            raise self.result
        return self

    async def __aexit__(self, *_args):
        return None

    async def post(self, url, json):
        self.calls.append(("post", url, json))
        if isinstance(self.result, Exception):
            raise self.result
        return self.result

    def stream(self, method, url, json):
        self.calls.append((method, url, json))
        return self.result


def _install_ollama_client(monkeypatch, *results):
    queued = deque(results)
    calls = []

    def factory(**_kwargs):
        return _OllamaClient(queued.popleft(), calls)

    monkeypatch.setattr(providers.httpx, "AsyncClient", factory)
    return calls


def test_provider_helpers_and_selection(monkeypatch):
    monkeypatch.setenv("RESUME_LLM_TIMEOUT_SECONDS", "2.5")
    assert providers._timeout_seconds() == 2.5
    monkeypatch.setenv("RESUME_LLM_TIMEOUT_SECONDS", "broken")
    assert providers._timeout_seconds() == 60.0
    monkeypatch.setenv("RESUME_LLM_TIMEOUT_SECONDS", "0")
    assert providers._timeout_seconds() == 1.0

    assert providers._response_error_text(" plain ") == "plain"
    assert providers._response_error_text('{"error": " missing "}') == "missing"
    assert providers._response_error_text('{"message": " bad "}') == "bad"
    assert providers._response_error_text('{"detail": " detail "}') == "detail"
    assert providers._response_error_text('{"other": "value"}') == '{"other": "value"}'
    assert providers._response_error_text('["value"]') == '["value"]'
    assert "needs more memory" in providers._ollama_unavailable_message("large", "model request too large")
    assert "ollama pull absent" in providers._ollama_unavailable_message("absent", "please pull")
    assert providers._ollama_unavailable_message("model", "other") == providers.LOCAL_MODEL_UNAVAILABLE_MESSAGE

    monkeypatch.setenv("RESUME_LLM_PROVIDER", "ollama")
    assert isinstance(providers.get_resume_llm_provider(), providers.OllamaResumeLLMProvider)
    monkeypatch.setenv("RESUME_LLM_PROVIDER", "openai")
    assert isinstance(providers.get_resume_llm_provider(), providers.OpenAIResumeLLMProvider)
    monkeypatch.setenv("RESUME_LLM_PROVIDER", "other")
    with pytest.raises(providers.ResumeLLMProviderError, match="Unsupported"):
        providers.get_resume_llm_provider()


@pytest.mark.asyncio
async def test_protocol_methods_are_covered():
    assert await providers.ResumeLLMProvider.generate(None, system="", messages=[]) is None
    assert await providers.ResumeLLMProvider.stream(None, system="", messages=[]) is None


@pytest.mark.asyncio
async def test_ollama_generate_success_payload_options_and_no_keep_alive(monkeypatch):
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://ollama/")
    monkeypatch.setenv("RESUME_LLM_MODEL", "model")
    calls = _install_ollama_client(
        monkeypatch,
        _OllamaResponse(),
        _OllamaResponse(data={"message": {"content": "second"}}),
        _OllamaResponse(data={"message": {"content": "third"}}),
    )
    provider = providers.OllamaResumeLLMProvider()
    message = LLMMessage(role="user", content="question")

    response = await provider.generate(system="system", messages=[message])
    assert response.text == "answer"
    assert calls[0][1] == "http://ollama/api/chat"
    assert calls[0][2]["keep_alive"] == "30m"
    assert calls[0][2]["messages"][1] == {"role": "user", "content": "question"}

    response = await provider.generate(
        system="system",
        messages=[],
        temperature=0.8,
        max_tokens=10,
        options={"keep_alive": "", "top_k": 4},
    )
    assert response.text == "second"
    assert "keep_alive" not in calls[1][2]
    assert calls[1][2]["options"] == {"temperature": 0.8, "num_predict": 10, "top_k": 4}

    response = await provider.generate(system="system", messages=[], options={"top_p": 0.9})
    assert response.text == "third"
    assert calls[2][2]["keep_alive"] == "30m"
    assert calls[2][2]["options"]["top_p"] == 0.9


@pytest.mark.asyncio
async def test_ollama_generate_errors(monkeypatch):
    calls = _install_ollama_client(
        monkeypatch,
        httpx.ConnectError("offline"),
        _OllamaResponse(404),
        _OllamaResponse(400, text="MODEL please PULL"),
        _OllamaResponse(500, text='{"error": "requires more system memory"}'),
        _OllamaResponse(429, raise_error=RuntimeError("bad response")),
        _OllamaResponse(data={"message": {"content": ""}}),
    )
    provider = providers.OllamaResumeLLMProvider()

    for expected in ["local model", "ollama pull", "ollama pull", "needs more memory", "unexpected", "empty"]:
        with pytest.raises(providers.ResumeLLMProviderError, match=expected):
            await provider.generate(system="", messages=[])
    assert len(calls) == 5


@pytest.mark.asyncio
async def test_ollama_stream_success_payload_and_errors(monkeypatch):
    calls = _install_ollama_client(
        monkeypatch,
        _OllamaResponse(
            lines=[
                "",
                "not json",
                '{"message": {"content": ""}}',
                '{"message": {"content": "one"}}',
                '{"message": {"content": "two"}, "done": false}',
                '{"done": true}',
                '{"message": {"content": "ignored"}}',
            ]
        ),
        _OllamaResponse(lines=['{"message": {"content": "last"}}']),
        _OllamaResponse(404, text="missing"),
        _OllamaResponse(400, text="MODEL please PULL"),
        _OllamaResponse(500, text='{"detail": "model request too large"}'),
        _OllamaResponse(429, raise_error=RuntimeError("bad response")),
        httpx.ConnectError("offline"),
    )
    provider = providers.OllamaResumeLLMProvider()

    assert [
        chunk
        async for chunk in provider.stream(
            system="system",
            messages=[],
            options={"keep_alive": "", "top_k": 5},
        )
    ] == ["one", "two"]
    assert "keep_alive" not in calls[0][2]
    assert calls[0][2]["options"]["top_k"] == 5

    assert [
        chunk async for chunk in provider.stream(system="", messages=[], options={"top_p": 0.9})
    ] == ["last"]
    assert calls[1][2]["keep_alive"] == "30m"
    assert calls[1][2]["options"]["top_p"] == 0.9

    for expected in ["ollama pull", "ollama pull", "needs more memory", "bad response", "local model"]:
        with pytest.raises((providers.ResumeLLMProviderError, RuntimeError), match=expected):
            _ = [chunk async for chunk in provider.stream(system="", messages=[])]


def _install_openai_module(monkeypatch, *results):
    queued = deque(results)
    calls = []

    class Completions:
        async def create(self, **kwargs):
            calls.append(kwargs)
            result = queued.popleft()
            if isinstance(result, Exception):
                raise result
            return result

    class AsyncOpenAI:
        def __init__(self, **kwargs):
            calls.append(kwargs)
            self.chat = SimpleNamespace(completions=Completions())

    module = ModuleType("openai")
    module.AsyncOpenAI = AsyncOpenAI
    monkeypatch.setitem(sys.modules, "openai", module)
    return calls


@pytest.mark.asyncio
async def test_openai_generate_success_empty_and_failure(monkeypatch):
    success = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=" answer "))],
        model_dump=lambda: {"id": "response"},
    )
    empty = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=""))])
    calls = _install_openai_module(monkeypatch, success, empty, RuntimeError("offline"))
    provider = providers.OpenAIResumeLLMProvider()

    response = await provider.generate(
        system="system",
        messages=[LLMMessage(role="user", content="question")],
        temperature=0.1,
        max_tokens=12,
    )
    assert response.text == "answer"
    assert response.raw == {"id": "response"}
    assert calls[1]["messages"][1] == {"role": "user", "content": "question"}

    with pytest.raises(providers.ResumeLLMProviderError, match="empty"):
        await provider.generate(system="", messages=[])
    with pytest.raises(providers.ResumeLLMProviderError, match="request failed"):
        await provider.generate(system="", messages=[])


@pytest.mark.asyncio
async def test_openai_stream_success_and_failure(monkeypatch):
    async def good_stream():
        yield SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content="one"))])
        yield SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content=""))])
        yield SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content="two"))])

    async def bad_stream():
        raise RuntimeError("offline")
        yield

    calls = _install_openai_module(monkeypatch, good_stream(), RuntimeError("create failed"), bad_stream())
    provider = providers.OpenAIResumeLLMProvider()

    assert [chunk async for chunk in provider.stream(system="", messages=[])] == ["one", "two"]
    assert calls[1]["stream"] is True
    with pytest.raises(providers.ResumeLLMProviderError, match="stream failed"):
        _ = [chunk async for chunk in provider.stream(system="", messages=[])]
    with pytest.raises(providers.ResumeLLMProviderError, match="stream failed"):
        _ = [chunk async for chunk in provider.stream(system="", messages=[])]


@pytest.mark.asyncio
@pytest.mark.parametrize("method", ["generate", "stream"])
async def test_openai_sdk_missing(monkeypatch, method):
    real_import = builtins.__import__

    def missing_openai(name, *args, **kwargs):
        if name == "openai":
            raise ImportError("missing")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", missing_openai)
    provider = providers.OpenAIResumeLLMProvider()
    with pytest.raises(providers.ResumeLLMProviderError, match="SDK is not installed"):
        if method == "generate":
            await provider.generate(system="", messages=[])
        else:
            _ = [chunk async for chunk in provider.stream(system="", messages=[])]
