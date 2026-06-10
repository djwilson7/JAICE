import pytest
import os
import sys
import importlib
import types
from unittest.mock import MagicMock, patch

import tests.conftest as conftest

def test_pytest_configure_windows(monkeypatch):
    monkeypatch.setattr(os, "name", "nt")
    mock_config = MagicMock()
    
    # Needs to not fail
    conftest.pytest_configure(mock_config)
    assert hasattr(mock_config.option, "basetemp")

def test_bs4_stub_importlib_find_spec_success(monkeypatch):
    monkeypatch.setattr(conftest.importlib.util, "find_spec", lambda x: True)
    if "bs4" in sys.modules:
        del sys.modules["bs4"]
    conftest._install_bs4_stub()
    assert "bs4" not in sys.modules
    conftest._install_bs4_stub() # reinstall it normally for other tests

def test_bs4_stub_functionality(monkeypatch):
    # Remove to force reinstall
    if "bs4" in sys.modules:
        del sys.modules["bs4"]
        
    # We must force find_spec to return None so the stub installs
    monkeypatch.setattr(conftest.importlib.util, "find_spec", lambda x: None)
    
    conftest._install_bs4_stub()
    
    # We must use the stub directly since the environment might have actual bs4 installed
    soup = sys.modules["bs4"].BeautifulSoup("<p>Test</p><script>alert()</script><style>body{}</style>")
    
    soup(["script", "style"])
    # The stub directly modifies its .html attribute
    assert hasattr(soup, "html")
    assert soup.html == "<p>Test</p>"
    
    soup2 = sys.modules["bs4"].BeautifulSoup("<p>Hello <b>World</b></p>")
    assert soup2.get_text() == "Hello World"

def test_fake_celery_app():
    app = conftest.FakeCeleryApp()
    
    @app.task()
    def my_task():
        pass
        
    my_task.delay(1, 2)
    my_task.apply_async(3, 4)
    
    app.send_task("task", 5, key="val")
    assert len(app.sent_tasks) == 1
    assert app.sent_tasks[0][0] == ("task", 5)
    assert app.sent_tasks[0][1] == {"key": "val"}

def test_worker_boot_stubs_import_error(monkeypatch):
    fake_app = conftest.FakeCeleryApp()
    
    def failing_import(name):
        raise ImportError("mock")
        
    monkeypatch.setattr(conftest.importlib, "import_module", failing_import)
    
    # We need to temporarily remove classification to hit the ImportError branch
    if "classification" in sys.modules:
        del sys.modules["classification"]
        
    conftest._install_worker_boot_stubs()
    
    assert "classification" in sys.modules
    assert isinstance(sys.modules["classification"], types.ModuleType)
    assert hasattr(sys.modules["classification"], "class_worker")
    
@pytest.mark.asyncio
async def test_async_conn():
    conn = conftest.AsyncConn(fetch=[1, 2], fetchrow=[3])
    
    res1 = await conn.fetch("SELECT 1")
    assert res1 == 1
    assert conn.fetch_calls == [("SELECT 1", ())]
    
    res2 = await conn.fetchrow("SELECT 2", "a")
    assert res2 == 3
    assert conn.fetchrow_calls == [("SELECT 2", ("a",))]
    
    res3 = await conn.execute("UPDATE")
    assert res3 == "UPDATE 1"
    assert conn.execute_calls == [("UPDATE", ())]
    
    # Test empty queues
    # The second fetch call should pop '2' because fetch queue was initialized with [1, 2]
    assert await conn.fetch("S") == 2
    assert await conn.fetch("S2") == []
    
    # fetchrow queue was initialized with [3], already popped. Should return None.
    assert await conn.fetchrow("S") is None

@pytest.mark.asyncio
async def test_connection_context():
    conn = conftest.AsyncConn()
    async with conftest.connection_context(conn) as c:
        assert c is conn

def test_user_fixture():
    # Calling the fixture directly for coverage by unwrapping it
    u = conftest.user.__wrapped__() if hasattr(conftest.user, '__wrapped__') else conftest.user()
    assert u["uid"] == "user-123"
