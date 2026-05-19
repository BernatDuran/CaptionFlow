from subtitle_pipeline.doctor import doctor_exit_code, format_doctor_report, run_doctor


def test_run_doctor_reports_successful_environment_when_everything_is_available():
    checks = run_doctor(
        which=lambda command: "C:/bin/ffmpeg.exe" if command == "ffmpeg" else None,
        find_spec=lambda name: object(),
        environ={"ANTHROPIC_API_KEY": "test-key"},
    )

    statuses = {check.name: check.status for check in checks}

    assert statuses["ffmpeg executable"] == "pass"
    assert statuses["faster-whisper"] == "pass"
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
    assert doctor_exit_code(checks) == 0


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
