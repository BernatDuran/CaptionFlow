import builtins
import subprocess

import pytest

from subtitle_pipeline.audio_extractor import extract_audio


def test_extract_audio_falls_back_to_ffmpeg_binary_when_python_package_missing(
    tmp_path,
    monkeypatch,
):
    input_path = tmp_path / "sample.mp3"
    output_path = tmp_path / "out" / "sample.wav"
    input_path.write_bytes(b"demo")
    calls = []
    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "ffmpeg":
            raise ModuleNotFoundError("No module named 'ffmpeg'", name="ffmpeg")
        return real_import(name, *args, **kwargs)

    def fake_run(command, **kwargs):
        calls.append((command, kwargs))
        output_path.write_bytes(b"wav")
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    monkeypatch.setattr(subprocess, "run", fake_run)

    result = extract_audio(str(input_path), str(output_path), sample_rate=22050)

    assert result == str(output_path)
    assert calls[0][0] == [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-ac",
        "1",
        "-ar",
        "22050",
        "-f",
        "wav",
        str(output_path),
    ]
    assert calls[0][1]["check"] is True
    assert calls[0][1]["capture_output"] is True


def test_extract_audio_reports_missing_ffmpeg_binary(tmp_path, monkeypatch):
    input_path = tmp_path / "sample.mp3"
    output_path = tmp_path / "sample.wav"
    input_path.write_bytes(b"demo")
    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "ffmpeg":
            raise ModuleNotFoundError("No module named 'ffmpeg'", name="ffmpeg")
        return real_import(name, *args, **kwargs)

    def fake_run(command, **kwargs):
        raise FileNotFoundError("ffmpeg")

    monkeypatch.setattr(builtins, "__import__", fake_import)
    monkeypatch.setattr(subprocess, "run", fake_run)

    with pytest.raises(RuntimeError, match="ffmpeg executable was not found"):
        extract_audio(str(input_path), str(output_path))
