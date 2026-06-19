import json
from unittest.mock import patch, MagicMock
from pathlib import Path
import pytest
from common.resume_render.spec import (
    _require_mapping,
    load_render_spec,
    load_document_css,
    load_formatting_css,
    load_formatting_tokens,
    load_render_fixtures,
)

def test_require_mapping_failure():
    with pytest.raises(ValueError, match="test label must be an object"):
        _require_mapping("not a dict", "test label")

def test_load_render_spec_validation():
    load_render_spec.cache_clear()
    
    # 1. Non-dict root
    with patch.object(Path, "read_text", return_value="[]"):
        with pytest.raises(ValueError, match="resume render spec must be an object"):
            load_render_spec()

    load_render_spec.cache_clear()
    # 2. Missing key
    with patch.object(Path, "read_text", return_value='{"version": 1}'):
        with pytest.raises(ValueError, match="resume render spec is missing defaults"):
            load_render_spec()

    load_render_spec.cache_clear()
    # 3. Paper size mapping failure
    mock_data = {
        "version": 1,
        "defaults": {},
        "limits": {},
        "paperSizes": {"a4": "not a dict"},
        "densityNames": ["compact", "standard", "relaxed"]
    }
    with patch.object(Path, "read_text", return_value=json.dumps(mock_data)):
        with pytest.raises(ValueError, match="paperSizes.a4 must be an object"):
            load_render_spec()

    load_render_spec.cache_clear()
    # 4. Invalid density names
    mock_data2 = {
        "version": 1,
        "defaults": {},
        "limits": {},
        "paperSizes": {"a4": {}, "letter": {}},
        "densityNames": ["invalid"]
    }
    with patch.object(Path, "read_text", return_value=json.dumps(mock_data2)):
        with pytest.raises(ValueError, match="resume render spec has invalid density names"):
            load_render_spec()

    # Restore cached version
    load_render_spec.cache_clear()
    load_render_spec()

def test_load_document_css_validation():
    load_document_css.cache_clear()
    with patch.object(Path, "read_text", return_value="body { color: black; }"):
        with pytest.raises(ValueError, match="canonical resume document CSS is invalid"):
            load_document_css()

    load_document_css.cache_clear()
    load_document_css()

def test_load_formatting_css_validation():
    load_formatting_css.cache_clear()
    with patch.object(Path, "read_text", return_value="body { color: black; }"):
        with pytest.raises(ValueError, match="canonical resume formatting CSS is invalid"):
            load_formatting_css()

    load_formatting_css.cache_clear()
    load_formatting_css()

def test_load_formatting_tokens_validation():
    load_formatting_tokens.cache_clear()
    load_formatting_css.cache_clear()
    
    # Missing required token
    invalid_css = ":root { --resume-default-title-font-size-pt: 12; }"
    with patch("common.resume_render.spec.load_formatting_css", return_value=invalid_css):
        with pytest.raises(ValueError, match="resume formatting CSS is missing tokens:"):
            load_formatting_tokens()

    load_formatting_tokens.cache_clear()
    load_formatting_css.cache_clear()
    load_formatting_tokens()

def test_load_render_fixtures_validation():
    load_render_fixtures.cache_clear()
    
    # 1. Non-dict root
    with patch.object(Path, "read_text", return_value="[]"):
        with pytest.raises(ValueError, match="resume render fixtures must be an object"):
            load_render_fixtures()

    load_render_fixtures.cache_clear()
    # 2. Missing cases list
    with patch.object(Path, "read_text", return_value='{"cases": "not a list"}'):
        with pytest.raises(ValueError, match="resume render fixtures must contain cases"):
            load_render_fixtures()

    load_render_fixtures.cache_clear()
    load_render_fixtures()
