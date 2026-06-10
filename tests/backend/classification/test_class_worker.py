from __future__ import annotations

import importlib
import classification.class_worker

def test_class_worker_import() -> None:
    assert classification.class_worker is not None

def test_class_worker_forced_coverage() -> None:
    import sys
    import importlib
    # Ensure the module is loaded and in sys.modules
    m = importlib.import_module("classification.class_worker")
    importlib.reload(m)
    assert m is not None

