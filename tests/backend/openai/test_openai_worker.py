from __future__ import annotations

import logging
from unittest import mock

import pytest

import OpenAI.OpenAI_worker
from OpenAI.OpenAI_worker import load_model_on_worker_start

def test_load_model_on_worker_start_success() -> None:
    # Reset global
    OpenAI.OpenAI_worker.OPENAI_LOADED = False
    
    load_model_on_worker_start()
    
    assert OpenAI.OpenAI_worker.OPENAI_LOADED is True
    
    # Test early return
    load_model_on_worker_start()
    assert OpenAI.OpenAI_worker.OPENAI_LOADED is True

def test_load_model_on_worker_start_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    # Reset global
    OpenAI.OpenAI_worker.OPENAI_LOADED = False
    
    # We want to raise an exception ONLY when logging.info is called inside the try block.
    # The logging.info calls during worker start:
    # 1. logging.info("Loading OPENAI model on worker start") (outside try)
    # 2. logging.info("Loading OpenAI Worker...") (outside try)
    # 3. logging.info("Loading OpenAI Worker...") (inside try)
    # Raising on the 3rd call ensures it occurs inside the try-catch block, covering the except block.
    call_count = 0
    def mock_info(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 3:
            raise Exception("Test error")
            
    monkeypatch.setattr(OpenAI.OpenAI_worker.logging, "info", mock_info)
    
    with pytest.raises(Exception, match="Test error"):
        load_model_on_worker_start()
