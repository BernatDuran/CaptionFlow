from subtitle_pipeline.doctor import doctor_exit_code, format_doctor_report, run_doctor


def test_run_doctor_reports_successful_environment_when_everything_is_available():
    checks = run_doctor(
        which=lambda command: "C:/bin/ffmpeg.exe" if command == "ffmpeg" else None,
        find_spec=lambda name: object(),
        environ={"ANTHROPIC_API_KEY": "test-key"},
    )

    statuses = {check.name: check.status for check in checks}

    assert statuses["ffmpeg executable"] == "pass"
    assert statuses["package:transcription:faster-whisper"] == "pass"
    assert statuses["provider:transcription:faster-whisper"] == "pass"
    assert statuses["provider:translation:claude"] == "pass"
    assert statuses["ANTHROPIC_API_KEY"] == "pass"
    assert doctor_exit_code(checks) == 0


def test_run_doctor_fails_when_required_runtime_dependency_is_missing():
    checks = run_doctor(
        which=lambda command: None,
        find_spec=lambda name: object(),
        environ={"ANTHROPIC_API_KEY": "test-key"},
    )

    statuses = {check.name: check.status for check in checks}

    assert statuses["ffmpeg executable"] == "fail"
    assert doctor_exit_code(checks) == 1


def test_run_doctor_warns_when_anthropic_key_is_missing():
    checks = run_doctor(
        which=lambda command: "ffmpeg",
        find_spec=lambda name: object(),
        environ={},
    )

    statuses = {check.name: check.status for check in checks}

    assert statuses["ANTHROPIC_API_KEY"] == "warn"
    assert statuses["provider:translation:claude"] == "warn"
    assert doctor_exit_code(checks) == 0


def test_run_doctor_reports_provider_dependency_failures():
    checks = run_doctor(
        which=lambda command: "ffmpeg",
        find_spec=lambda name: None,
        environ={"ANTHROPIC_API_KEY": "test-key"},
    )

    statuses = {check.name: check.status for check in checks}

    assert statuses["provider:transcription:faster-whisper"] == "fail"
    assert statuses["provider:translation:claude"] == "fail"
    assert doctor_exit_code(checks) == 1


def test_format_doctor_report_is_human_readable():
    checks = run_doctor(
        which=lambda command: "ffmpeg",
        find_spec=lambda name: object(),
        environ={},
    )

    report = format_doctor_report(checks)

    assert report.startswith("CaptionFlow environment check")
    assert "[PASS] ffmpeg executable:" in report
    assert "[WARN] ANTHROPIC_API_KEY:" in report


def test_run_doctor_provider_key_check_uses_provider_capabilities():
    checks = run_doctor(
        which=lambda command: "ffmpeg",
        find_spec=lambda name: object(),
        environ={},
    )

    by_name = {check.name: check for check in checks}

    assert by_name["provider:translation:claude"].status == "warn"
    assert "ANTHROPIC_API_KEY" in by_name["provider:translation:claude"].message


def test_run_doctor_warns_for_missing_optional_python_packages():
    checks = run_doctor(
        which=lambda command: "ffmpeg",
        find_spec=lambda name: None,
        environ={"ANTHROPIC_API_KEY": "test-key"},
    )

    statuses = {check.name: check.status for check in checks}

    assert statuses["package:translation-local:transformers"] == "warn"
    assert statuses["package:dubbing:numpy"] == "warn"
