from __future__ import annotations

import os
from unittest import mock

import pytest
from celery import Celery

from shared_worker_library.celery_app import celery_app
from shared_worker_library.utils.task_definitions import TaskType


def test_celery_app_initialization() -> None:
    assert isinstance(celery_app, Celery)
    assert celery_app.main == "Workers"
    
    # Check queues are registered
    assert len(celery_app.conf.task_queues) == len(TaskType)
    
    # Check routes are registered
    assert len(celery_app.conf.task_routes) == len(TaskType)
    for task in TaskType:
        assert task.task_name in celery_app.conf.task_routes
        assert celery_app.conf.task_routes[task.task_name] == {"queue": task.queue_name}

def test_celery_broker_url_prod(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CELERY_BROKER_URL_LOCAL", raising=False)
    monkeypatch.setenv("CELERY_BROKER_URL_PROD", "redis://prod:6379/0")
    
    # Reload module to trigger env var read
    import importlib
    import shared_worker_library.celery_app
    importlib.reload(shared_worker_library.celery_app)
    
    assert shared_worker_library.celery_app.celery_app.conf.broker_url == "redis://prod:6379/0"

def test_celery_broker_url_local(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CELERY_BROKER_URL_LOCAL", "redis://local:6379/0")
    monkeypatch.setenv("CELERY_BROKER_URL_PROD", "redis://prod:6379/0")
    
    # Reload module to trigger env var read
    import importlib
    import shared_worker_library.celery_app
    importlib.reload(shared_worker_library.celery_app)
    
    assert shared_worker_library.celery_app.celery_app.conf.broker_url == "redis://local:6379/0"
