from pathlib import Path
from unittest.mock import patch
from client_api.services.resume_pdf.fonts import _font_data_uri, build_font_face_css

def test_font_data_uri_missing_file():
    assert _font_data_uri(Path("non_existent_font.ttf")) is None

def test_font_data_uri_valid_file(tmp_path):
    fake_font = tmp_path / "fake.ttf"
    fake_font.write_bytes(b"mock font content")
    res = _font_data_uri(fake_font)
    assert res is not None
    assert res.startswith("data:font/ttf;base64,")

def test_build_font_face_css():
    # Calling it naturally should find some fonts or not crash if missing
    css = build_font_face_css()
    # It should either be empty or contain some font faces depending on environment
    assert isinstance(css, str)

def test_build_font_face_css_mocked():
    # Mock _font_data_uri to return None for everything
    with patch("client_api.services.resume_pdf.fonts._font_data_uri", return_value=None):
        css = build_font_face_css()
        assert css == ""
