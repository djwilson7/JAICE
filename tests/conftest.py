from __future__ import annotations

import importlib.util
import importlib.machinery
import os
import re
import sys
import types
from collections import deque
from contextlib import asynccontextmanager
from typing import Any

import pytest


os.environ.setdefault(
    "FERNET_KEY", "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="
)
os.environ.setdefault("CELERY_BROKER_URL_LOCAL", "redis://localhost:6379/0")
os.environ.setdefault("WORKER_DATABASE_URL", "postgresql://worker:test@localhost/test")
os.environ.setdefault("CLIENT_DATABASE_URL", "postgresql://client:test@localhost/test")
os.environ.setdefault("SUPABASE_JWT_SECRET", "unit-test-supabase-secret")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("BACKGROUND_DURATION_DAYS", "365")
os.environ.setdefault("PERMISSIONS_SCOPES", '["https://www.googleapis.com/auth/gmail.readonly"]')
os.environ.setdefault("VITE_API_BASE_URL_LOCAL", "http://testserver")
os.environ.setdefault("FRONTEND_DASHBOARD_URL_LOCAL", "http://frontend.local/dashboard")
os.environ.setdefault("CLIENT_SECRETS_LOCAL", '{"web":{"client_id":"id","client_secret":"secret"}}')
os.environ.setdefault("GOOGLE_CLIENT_ID_LOCAL", "google-client")
os.environ.setdefault("GOOGLE_CLIENT_SECRET_LOCAL", "google-secret")


def _install_bs4_stub() -> None:
    if "bs4" in sys.modules:
        return
    if importlib.util.find_spec("bs4") is not None:
        return

    module = types.ModuleType("bs4")
    module.__spec__ = importlib.machinery.ModuleSpec("bs4", loader=None)

    class BeautifulSoup:
        def __init__(self, html: str, parser: str = "html.parser") -> None:
            self.html = html or ""

        def __call__(self, names: list[str]) -> list[Any]:
            if "script" in names:
                self.html = re.sub(r"<script\b[^>]*>.*?</script>", "", self.html, flags=re.I | re.S)
            if "style" in names:
                self.html = re.sub(r"<style\b[^>]*>.*?</style>", "", self.html, flags=re.I | re.S)
            return []

        def get_text(self) -> str:
            return re.sub(r"<[^>]+>", "", self.html)

    module.BeautifulSoup = BeautifulSoup
    sys.modules["bs4"] = module


_install_bs4_stub()


class FakeCeleryApp:
    def __init__(self) -> None:
        self.sent_tasks: list[tuple[tuple[Any, ...], dict[str, Any]]] = []

    def task(self, *_args: Any, **_kwargs: Any):
        def decorator(func):
            func.delay = lambda *args, **kwargs: None
            func.apply_async = lambda *args, **kwargs: None
            return func

        return decorator

    def send_task(self, *args: Any, **kwargs: Any) -> None:
        self.sent_tasks.append((args, kwargs))


def _install_worker_boot_stubs() -> None:
    fake_app = FakeCeleryApp()
    for module_name in (
        "classification.class_worker",
        "gmail.gmail_worker",
        "ner.ner_worker",
    ):
        module = types.ModuleType(module_name)
        module.celery_app = fake_app
        module.NLP_MODEL = None
        sys.modules.setdefault(module_name, module)


_install_worker_boot_stubs()


class AsyncConn:
    def __init__(self, *, fetch: list[Any] | None = None, fetchrow: list[Any] | None = None) -> None:
        self.fetch_results = deque(fetch or [])
        self.fetchrow_results = deque(fetchrow or [])
        self.fetch_calls: list[tuple[str, tuple[Any, ...]]] = []
        self.fetchrow_calls: list[tuple[str, tuple[Any, ...]]] = []
        self.execute_calls: list[tuple[str, tuple[Any, ...]]] = []

    async def fetch(self, query: str, *args: Any) -> Any:
        self.fetch_calls.append((query, args))
        return self.fetch_results.popleft() if self.fetch_results else []

    async def fetchrow(self, query: str, *args: Any) -> Any:
        self.fetchrow_calls.append((query, args))
        return self.fetchrow_results.popleft() if self.fetchrow_results else None

    async def execute(self, query: str, *args: Any) -> str:
        self.execute_calls.append((query, args))
        return "UPDATE 1"


@asynccontextmanager
async def connection_context(conn: AsyncConn):
    yield conn


@pytest.fixture
def user() -> dict[str, str]:
    return {"uid": "user-123", "email": "user@example.com"}
