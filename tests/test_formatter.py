from subtitle_pipeline.formatter import to_srt, to_txt, to_vtt
from subtitle_pipeline.models import Segment


def test_to_srt_prefers_translated_text_when_available():
    segments = [
        Segment(start=1.25, end=3.5, text="Hello", translated="Hola"),
        Segment(start=65.0, end=66.125, text="World", translated="Mundo"),
    ]

    assert to_srt(segments, use_translated=True) == (
        "1\n"
        "00:00:01,250 --> 00:00:03,500\n"
        "Hola\n"
        "\n"
        "2\n"
        "00:01:05,000 --> 00:01:06,125\n"
        "Mundo\n"
    )


def test_to_srt_falls_back_to_original_text():
    segments = [Segment(start=0.0, end=1.0, text="Hello", translated="")]

    assert "Hello" in to_srt(segments, use_translated=True)


def test_to_vtt_includes_header_and_dot_milliseconds():
    segments = [Segment(start=0.5, end=2.75, text="Hello", translated="Hola")]

    assert to_vtt(segments) == "WEBVTT\n\n00:00:00.500 --> 00:00:02.750\nHola\n"


def test_to_txt_writes_one_segment_per_line():
    segments = [
        Segment(start=0.0, end=1.0, text="Hello", translated="Hola"),
        Segment(start=1.0, end=2.0, text="World", translated="Mundo"),
    ]

    assert to_txt(segments) == "Hola\nMundo"
