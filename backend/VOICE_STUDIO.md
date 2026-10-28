# Home AI voice studio

The Home page records up to 30 seconds through `MediaRecorder`. The authenticated
`/api/voice/transcribe` endpoint validates the browser audio and sends it inline
to Gemini through the PHP backend. After recognition succeeds, the recording and
transcript are saved in TiDB under the authenticated account. The user can
correct the returned transcript, choose a voice, and then request
`/api/voice/synthesize` to get a downloadable MP3.

## Cloud transcription

Render only needs the existing PHP container and these environment variables:

```dotenv
GEMINI_API_KEY=your_valid_server_side_key
GEMINI_TRANSCRIBE_MODEL=gemini-flash-latest
```

The same Gemini key may be used by the chat, report and suggestion endpoints.
The model name is configurable so it can be changed in Render without a code
deployment. The current request is limited to a 2 MB inline audio payload.

Supported browser containers are WebM/Opus, OGG, M4A/MP4 audio and WAV. The
server determines the MIME type from the file signature instead of trusting the
browser-provided filename or content type.

## Optional neural speech synthesis

Speech synthesis is separate from recognition. It uses Microsoft Edge online
neural TTS through `edge-tts`: `en-US-AnaNeural` and
`zh-CN-XiaoxiaoNeural`. Install the optional worker locally with:

```powershell
python -m venv .voice-venv
.voice-venv/Scripts/python.exe -m pip install -r backend/requirements-voice.txt
```

Then set the absolute Python path in `backend/.env`:

```dotenv
VOICE_PYTHON=E:/path/to/project/.voice-venv/Scripts/python.exe
```

Without `VOICE_PYTHON`, transcription still works, while synthesis returns the
safe `voice_not_configured` response. Render does not need Python for speech
recognition.

## Data and limits

- Authentication determines the user; the endpoint ignores caller-supplied IDs.
- Recordings are limited to 2 MB and 30 seconds in the UI.
- PHP removes its temporary upload after the request. The authenticated copy is
  stored in `puffsqueeze_voice_recordings` together with its transcript, format,
  size and SHA-256 checksum.
- Duplicate retries from the same user and audio bytes update the existing row
  instead of storing another binary copy.
- The recording is sent to Gemini and retained in TiDB, both disclosed in the UI.
- Returned text is limited to 600 characters and can be edited before synthesis.
- Saved generated clips are account documents, limited to three clips and about
  1.8 MB of JSON.
- Microphone access requires HTTPS or localhost.

Official Gemini audio documentation:
https://ai.google.dev/gemini-api/docs/audio
