# Video recording and verification

ChoiceMirror captures its real Next.js interface in a headed Chromium session using FFmpeg/X11, while the test controller runs the selected benchmark comparisons.

**Verified genuine Nebius recording:** [GitHub Actions run 44538869335](https://github.com/1tsDaksh/choiceMirror/actions/runs/44538869335) — **2:18.6**, 1440 × 900, H.264, no audio stream. The recording contains a real asymmetric membership result (Join 1 action / Leave 3 actions, 6 model calls) and a balanced result (Join 1 / Leave 1, 4 model calls). Four completed AI journeys recorded **10 inference calls** overall.

The final voiceover and edit points are in [DEMO_SCRIPT.md](DEMO_SCRIPT.md). The original footage is silent; its timestamped Markdown and optional SRT are guides rather than transcripts of spoken audio.

## Files produced

- \`choicemirror-ai-screen.mp4\` — silent real-screen recording.
- \`choicemirror-ai-timestamped-transcript.md\` — timestamped scene/caption guide.
- \`choicemirror-ai-optional-subtitles.srt\` — separate subtitles.
- \`choicemirror-ai-runs.json\` — comparison IDs, real modes, action counts and inference provenance.
- \`choicemirror-ai-verification.png\` — captured UI screenshot.

## Run the recorder

1. Keep \`NEBIUS_API_KEY\` in the repository's **private GitHub Actions secrets**. Never paste it in chat, a commit, an issue or a public URL. Revoke any older compromised keys.
2. Open [Record real ChoiceMirror desktop video](https://github.com/1tsDaksh/choiceMirror/actions/workflows/demo-video.yml).
3. Choose **Run workflow** on \`main\`, select **ai** mode, and start it. The trusted-main workflow can also be triggered by updating \`AI_VIDEO_RECORD_REQUEST.txt\`.
4. After success, inspect the workflow summary and download the \`choicemirror-ai-video-…\` artifact.
5. Check that both journeys completed with \`mode: "ai"\`, nonzero inference calls, correct screenshot evidence and a nonblank, changing video. Publish the final edited video on a host accessible to judges.

Pull-request previews run without Nebius credentials in **deterministic mode**. Their existence does **not** prove AI execution. The recorder rejects video files with invalid streams, frozen frames or missing metadata. Artifacts in GitHub Actions may expire; they are not permanent Devpost video links.

**Scope:** All footage shows synthetic benchmark pages, not third-party services.
