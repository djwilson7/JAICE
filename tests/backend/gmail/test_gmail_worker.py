from __future__ import annotations

def test_gmail_worker_import() -> None:
    import sys
    import importlib
    
    # Use import_module to ensure it's loaded and tracked properly
    m = importlib.import_module("gmail.gmail_worker")
    importlib.reload(m)
    assert m is not None

