from __future__ import annotations

import os
import json
from typing import AsyncIterator, Protocol

import httpx

from client_api.services.resume_chat.schemas import LLMMessage, LLMResponse


DEFAULT_RESUME_LLM_MODEL = "qwen2.5:1.5b"
LOCAL_MODEL_UNAVAILABLE_MESSAGE = (
    "The local model is not available. Confirm Ollama is running and the configured model has been pulled."
)


class ResumeLLMProviderError(RuntimeError):
    """Base error for resume LLM provider failures."""


class ResumeLLMProviderUnavailable(ResumeLLMProviderError):
    """Raised when the configured provider cannot serve the request."""


class ResumeLLMProvider(Protocol):
    async def generate(
        self,
        *,
        system: str,
        messages: list[LLMMessage],
        temperature: float = 0.3,
        max_tokens: int = 900,
        options: dict | None = None,
    ) -> LLMResponse:
        ...

    async def stream(
        self,
        *,
        system: str,
        messages: list[LLMMessage],
        temperature: float = 0.3,
        max_tokens: int = 900,
        options: dict | None = None,
    ) -> AsyncIterator[str]:
        ...


def _timeout_seconds() -> float:
    try:
        return max(1.0, float(os.getenv("RESUME_LLM_TIMEOUT_SECONDS", "60")))
    except ValueError:
        return 60.0


def _response_error_text(response_text: str) -> str:
    try:
        parsed = json.loads(response_text)
    except json.JSONDecodeError:
        return response_text.strip()

    if isinstance(parsed, dict):
        error = parsed.get("error") or parsed.get("message") or parsed.get("detail")
        if error:
            return str(error).strip()
    return response_text.strip()


def _ollama_unavailable_message(model: str, response_text: str) -> str:
    error_text = _response_error_text(response_text)
    lowered = error_text.lower()
    if "requires more system memory" in lowered or "model request too large" in lowered:
        return (
            f"The configured Ollama model '{model}' needs more memory than Docker currently has available. "
            f"Increase Docker's memory limit or use a smaller model such as {DEFAULT_RESUME_LLM_MODEL}."
        )
    if "not found" in lowered or "pull" in lowered:
        return f"The configured Ollama model '{model}' was not found. Run `ollama pull {model}` and retry."
    return LOCAL_MODEL_UNAVAILABLE_MESSAGE


class OllamaResumeLLMProvider:
    def __init__(self) -> None:
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/")
        self.model = os.getenv("RESUME_LLM_MODEL", DEFAULT_RESUME_LLM_MODEL)
        self.timeout = _timeout_seconds()
        self.keep_alive = os.getenv("OLLAMA_KEEP_ALIVE", "30m")

    async def generate(
        self,
        *,
        system: str,
        messages: list[LLMMessage],
        temperature: float = 0.3,
        max_tokens: int = 900,
        options: dict | None = None,
    ) -> LLMResponse:
        options_dict = {
            "temperature": temperature,
            "num_predict": max_tokens,
        }
        keep_alive = self.keep_alive
        if options:
            options_copy = dict(options)
            if "keep_alive" in options_copy:
                keep_alive = options_copy.pop("keep_alive")
            options_dict.update(options_copy)

        payload = {
            "model": self.model,
            "stream": False,
            "messages": [
                {"role": "system", "content": system},
                *[message.model_dump() for message in messages],
            ],
            "options": options_dict,
        }
        if keep_alive:
            payload["keep_alive"] = keep_alive

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/chat", json=payload)
        except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ResumeLLMProviderUnavailable(LOCAL_MODEL_UNAVAILABLE_MESSAGE) from exc

        response_text = response.text
        response_text_lower = response_text.lower()
        if response.status_code == 404 or (
            response.status_code == 400 and "model" in response_text_lower and ("not found" in response_text_lower or "pull" in response_text_lower)
        ):
            raise ResumeLLMProviderUnavailable(
                f"The configured Ollama model '{self.model}' was not found. Run `ollama pull {self.model}` and retry."
            )

        if response.status_code >= 500:
            raise ResumeLLMProviderUnavailable(_ollama_unavailable_message(self.model, response_text))

        try:
            response.raise_for_status()
            raw = response.json()
        except Exception as exc:
            raise ResumeLLMProviderError("Ollama returned an unexpected response.") from exc

        text = str((raw.get("message") or {}).get("content") or "").strip()
        if not text:
            raise ResumeLLMProviderError("Ollama returned an empty response.")

        return LLMResponse(text=text, raw=raw)

    async def stream(
        self,
        *,
        system: str,
        messages: list[LLMMessage],
        temperature: float = 0.3,
        max_tokens: int = 900,
        options: dict | None = None,
    ) -> AsyncIterator[str]:
        options_dict = {
            "temperature": temperature,
            "num_predict": max_tokens,
        }
        keep_alive = self.keep_alive
        if options:
            options_copy = dict(options)
            if "keep_alive" in options_copy:
                keep_alive = options_copy.pop("keep_alive")
            options_dict.update(options_copy)

        payload = {
            "model": self.model,
            "stream": True,
            "messages": [
                {"role": "system", "content": system},
                *[message.model_dump() for message in messages],
            ],
            "options": options_dict,
        }
        if keep_alive:
            payload["keep_alive"] = keep_alive

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(self.timeout, read=None)) as client:
                async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                    response_text = ""
                    if response.status_code >= 400:
                        response_text = (await response.aread()).decode("utf-8", errors="ignore")
                    response_text_lower = response_text.lower()
                    if response.status_code == 404 or (
                        response.status_code == 400 and "model" in response_text_lower and ("not found" in response_text_lower or "pull" in response_text_lower)
                    ):
                        raise ResumeLLMProviderUnavailable(
                            f"The configured Ollama model '{self.model}' was not found. Run `ollama pull {self.model}` and retry."
                        )
                    if response.status_code >= 500:
                        raise ResumeLLMProviderUnavailable(_ollama_unavailable_message(self.model, response_text))
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            raw = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        chunk = str((raw.get("message") or {}).get("content") or "")
                        if chunk:
                            yield chunk
                        if raw.get("done"):
                            break
        except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ResumeLLMProviderUnavailable(LOCAL_MODEL_UNAVAILABLE_MESSAGE) from exc


class OpenAIResumeLLMProvider:
    def __init__(self) -> None:
        self.model = os.getenv("RESUME_LLM_MODEL") or os.getenv("OPENAI_RESUME_MODEL", "gpt-4o-mini")
        self.timeout = _timeout_seconds()

    async def generate(
        self,
        *,
        system: str,
        messages: list[LLMMessage],
        temperature: float = 0.3,
        max_tokens: int = 900,
        options: dict | None = None,
    ) -> LLMResponse:
        try:
            from openai import AsyncOpenAI
        except ImportError as exc:
            raise ResumeLLMProviderError("OpenAI SDK is not installed.") from exc

        client = AsyncOpenAI(timeout=self.timeout)
        try:
            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    *[message.model_dump() for message in messages],
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
        except Exception as exc:
            raise ResumeLLMProviderError("OpenAI provider request failed.") from exc

        text = (response.choices[0].message.content or "").strip()
        if not text:
            raise ResumeLLMProviderError("OpenAI returned an empty response.")

        return LLMResponse(text=text, raw=response.model_dump())

    async def stream(
        self,
        *,
        system: str,
        messages: list[LLMMessage],
        temperature: float = 0.3,
        max_tokens: int = 900,
        options: dict | None = None,
    ) -> AsyncIterator[str]:
        try:
            from openai import AsyncOpenAI
        except ImportError as exc:
            raise ResumeLLMProviderError("OpenAI SDK is not installed.") from exc

        client = AsyncOpenAI(timeout=self.timeout)
        try:
            stream = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    *[message.model_dump() for message in messages],
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            async for event in stream:
                chunk = event.choices[0].delta.content or ""
                if chunk:
                    yield chunk
        except Exception as exc:
            raise ResumeLLMProviderError("OpenAI provider stream failed.") from exc


def get_resume_llm_provider() -> ResumeLLMProvider:
    provider_name = os.getenv("RESUME_LLM_PROVIDER", "ollama").strip().lower()
    if provider_name == "ollama":
        return OllamaResumeLLMProvider()
    if provider_name == "openai":
        return OpenAIResumeLLMProvider()
    raise ResumeLLMProviderError(
        f"Unsupported RESUME_LLM_PROVIDER '{provider_name}'. Expected 'ollama' or 'openai'."
    )
