# ChoiceMirror — silent screen recording + timestamped transcript

The [Record real ChoiceMirror desktop video](https://github.com/1tsDaksh/choiceMirror/actions/workflows/demo-video.yml) workflow captures genuine headed Chromium pixels using FFmpeg/X11 rather than stitching screenshots together.

## Files produced by each successful run

- `choicemirror-ai-screen.mp4` — **silent** screen recording with no audio track (or `choicemirror-deterministic-screen.mp4` for the PR preview).
- `choicemirror-ai-timestamped-transcript.md` — time-coded **optional voiceover script** describing what is actually on screen; it is **not** a transcript of spoken audio because the video is silent.
- `choicemirror-ai-optional-subtitles.srt` — separate, optional SRT captions generated from the same real-time markers. Captions are not burned into the video.
- `choicemirror-ai-runs.json` — actual comparison IDs, modes and action counts from the saved API records.
- `choicemirror-ai-verification.png` — a real screenshot from the recording session.

## Make the genuine Nebius AI recording

1. Generate a **fresh** Nebius Token Factory API key. Any previously exposed key must be revoked; do not reuse it.
2. In [GitHub Actions repository secrets](https://github.com/1tsDaksh/choiceMirror/settings/secrets/actions), create a repository secret named exactly `NEBIUS_API_KEY`. Paste the key into GitHub's protected secret form, **not in a chat, issue, source file, or PR comment**.
3. Open [the recording workflow](https://github.com/1tsDaksh/choiceMirror/actions/workflows/demo-video.yml).
4. Select **Run workflow**, branch **main**, recording mode **ai**, then launch the workflow.
5. Open the successful run and download its `choicemirror-ai-video-...` artifact. The ZIP contains the silent MP4, timestamped Markdown transcript, SRT and validation data.
6. Watch the video and check the timestamped transcript against the events. Publish the MP4 to an accessible public or unlisted video host for judges if required; a GitHub Actions artifact alone is **not** necessarily a publicly accessible Devpost demo link.

The manual `ai` run uses real Nebius inference against the project's controlled synthetic benchmark. It validates both stored journeys, confirms `mode: ai`, and checks that each journey recorded at least one real model inference call. It refuses failed or non-AI runs rather than passing off a deterministic script as an AI demonstration.

## No-credits preview and verification

Pull requests touching the recorder run only in **deterministic** mode and **never receive the Nebius key**. They create a true screen recording of the app, but are clearly labelled as **not AI inference**.

The workflow checks that the MP4 lasts 75–480 seconds, has a video stream and **no audio stream**, and contains nonblank, changing frames across the timeline. It also requires a nonempty timecoded Markdown transcript and SRT before publishing an artifact. A failed check prevents an artifact from being published as valid.

## Important limitations

The walkthrough records one asynchronous comparison after another on synthetic local fixtures, not third-party products. The timestamped text is an optional narration guide, not actual spoken dialogue. Real-model results depend on available provider credits and may vary in duration. The MP4 must be reviewed before final Devpost publication; neither recording the video nor creating a transcript submits the project.