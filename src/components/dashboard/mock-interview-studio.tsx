"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Check,
  Mic,
  MicOff,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  UserRound,
  Volume2,
} from "lucide-react";
import styles from "@/app/dashboard/mock-interviews/new/new-interview.module.css";

type TranscriptEntry = {
  id: string;
  text: string;
  createdAt: Date;
};

type RecognitionEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function speechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function summarizeTranscript(entries: TranscriptEntry[]): string {
  const text = entries.map((entry) => entry.text).join(" ").trim();
  if (!text) {
    return "No spoken responses were captured in this session.";
  }

  const words = text.match(/[a-zA-Z][a-zA-Z'-]*/g) ?? [];
  const ignored = new Set([
    "about", "after", "also", "because", "been", "could", "from", "have", "into",
    "just", "more", "that", "their", "then", "there", "they", "this", "through",
    "very", "what", "when", "where", "which", "with", "would", "your",
  ]);
  const counts = new Map<string, number>();
  for (const word of words) {
    const normalized = word.toLowerCase();
    if (normalized.length < 4 || ignored.has(normalized)) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  const themes = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word);
  const minutes = Math.max(1, Math.round(words.length / 130));

  return [
    `${entries.length} response segment${entries.length === 1 ? "" : "s"} captured`,
    `${words.length} spoken words`,
    `about ${minutes} minute${minutes === 1 ? "" : "s"} of speaking`,
    themes.length > 0 ? `key themes: ${themes.join(", ")}` : "no repeated themes yet",
  ].join(" · ");
}

export function MockInterviewStudio({ candidateName }: { candidateName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldListenRef = useRef(false);
  const [devicesReady, setDevicesReady] = useState(false);
  const [microphoneOn, setMicrophoneOn] = useState(true);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [deviceMessage, setDeviceMessage] = useState("Allow camera and microphone to begin.");
  const [summary, setSummary] = useState<string | null>(null);

  function stopMedia() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setDevicesReady(false);
    setCameraAvailable(false);
  }

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function prepareDevices(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) {
      setDeviceMessage("Camera and microphone access is not supported in this browser.");
      return false;
    }

    stopMedia();

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let videoStream: MediaStream | null = null;
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch {
        // Camera is optional; microphone transcription should still work.
      }

      const stream = new MediaStream([
        ...audioStream.getAudioTracks(),
        ...(videoStream?.getVideoTracks() ?? []),
      ]);
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const hasCamera = stream.getVideoTracks().length > 0;
      setDevicesReady(true);
      setMicrophoneOn(true);
      setCameraAvailable(hasCamera);
      setCameraOn(hasCamera);
      setDeviceMessage(
        hasCamera
          ? "Camera and microphone are ready."
          : "Microphone is ready. Camera permission is unavailable.",
      );
      return true;
    } catch {
      setDeviceMessage(
        "Microphone permission was blocked. Allow microphone access in browser settings, then try Devices again.",
      );
      return false;
    }
  }

  function beginRecognition() {
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setDeviceMessage("Live transcription requires Chrome or Edge speech recognition.");
      return false;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let interim = "";
      const completed: TranscriptEntry[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result) continue;
        const text = result?.[0]?.transcript.trim() ?? "";
        if (!text) continue;
        if (result.isFinal) {
          completed.push({
            id: `${Date.now()}-${index}`,
            text,
            createdAt: new Date(),
          });
        } else {
          interim += `${text} `;
        }
      }
      if (completed.length > 0) setEntries((current) => [...current, ...completed]);
      setInterimText(interim.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldListenRef.current = false;
        setListening(false);
        setDeviceMessage(
          "Speech recognition permission was blocked. Enable microphone access for this site and reload.",
        );
      } else if (event.error === "network") {
        setDeviceMessage(
          "Speech recognition could not reach the browser service. Check your connection or try Chrome/Edge.",
        );
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        setDeviceMessage(`Transcription paused: ${event.error.replaceAll("-", " ")}.`);
      }
    };
    recognition.onend = () => {
      if (shouldListenRef.current) {
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch {
            setListening(false);
          }
        }, 250);
      } else {
        setListening(false);
      }
    };
    recognitionRef.current = recognition;
    shouldListenRef.current = true;
    try {
      recognition.start();
      setListening(true);
      return true;
    } catch {
      shouldListenRef.current = false;
      recognitionRef.current = null;
      setDeviceMessage("Could not start speech recognition. Reload and try again in Chrome or Edge.");
      return false;
    }
  }

  async function startInterview() {
    setSummary(null);
    const ready = devicesReady || (await prepareDevices());
    if (!ready) return;
    if (beginRecognition()) {
      setDeviceMessage("Interview active. Your speech is being transcribed locally.");
    }
  }

  function stopInterview() {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterimText("");
    setSummary(summarizeTranscript(entries));
    setDeviceMessage("Interview stopped. Review the transcript and summary below.");
  }

  function toggleMicrophone() {
    const next = !microphoneOn;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicrophoneOn(next);
  }

  function toggleCamera() {
    const next = !cameraOn;
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraOn(next);
  }

  return (
    <>
      <section className={styles.studioGrid}>
        <div className={styles.roomPanel}>
          <div className={styles.roomTopBar}>
            <div><span className={listening ? styles.liveDot : styles.idleDot} />Interview room</div>
            <span>{listening ? "Listening…" : "Ready"}</span>
          </div>

          <div className={styles.videoStage}>
            <div className={styles.interviewer}>
              <div className={styles.interviewerAvatar}><UserRound size={46} strokeWidth={1.5} /></div>
              <p>Jobilly Interview Coach</p>
              <span>{listening ? "Listening to your response" : "Waiting to begin"}</span>
            </div>

            <div className={styles.candidatePreview}>
              <video
                ref={videoRef}
                className={`${styles.cameraVideo} ${cameraOn ? "" : styles.cameraVideoHidden}`}
                autoPlay
                muted
                playsInline
              />
              {!cameraOn || !devicesReady ? (
                <div className={styles.candidateAvatar}>{candidateName.charAt(0).toUpperCase()}</div>
              ) : null}
              <div className={styles.candidateMeta}>
                <strong>{candidateName}</strong>
                <span>{cameraOn && devicesReady ? "Camera on" : "Camera off"}</span>
              </div>
            </div>
          </div>

          <div className={styles.roomControls}>
            <button
              type="button"
              className={`${styles.controlButton} ${!microphoneOn ? styles.controlOff : ""}`}
              onClick={toggleMicrophone}
              disabled={!devicesReady}
              aria-pressed={microphoneOn}
            >
              {microphoneOn ? <Mic size={20} /> : <MicOff size={20} />}
              <span>Microphone</span>
            </button>
            <button
              type="button"
              className={`${styles.controlButton} ${!cameraOn ? styles.controlOff : ""}`}
              onClick={toggleCamera}
              disabled={!cameraAvailable}
              aria-pressed={cameraOn}
            >
              {cameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
              <span>Camera</span>
            </button>
            <button type="button" className={styles.controlButton} disabled>
              <Volume2 size={20} /><span>Speaker</span>
            </button>
            <button type="button" className={styles.controlButton} onClick={prepareDevices}>
              <Settings2 size={20} /><span>Devices</span>
            </button>
          </div>
        </div>

        <aside className={styles.setupPanel}>
          <div className={styles.setupHeading}>
            <span><Sparkles size={19} /></span>
            <div><h2>Interview setup</h2><p>Configure your practice session.</p></div>
          </div>

          <label className={styles.field}>
            <span>Target role</span>
            <select defaultValue="software-engineer">
              <option value="software-engineer">Software Engineer</option>
              <option value="frontend">Frontend Developer</option>
              <option value="data-analyst">Data Analyst</option>
              <option value="product-manager">Product Manager</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Interview format</span>
            <select defaultValue="mixed">
              <option value="mixed">Technical + Behavioral</option>
              <option value="technical">Technical interview</option>
              <option value="behavioral">Behavioral interview</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Difficulty</span>
            <select defaultValue="adaptive">
              <option value="adaptive">Adaptive</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>

          <div className={styles.deviceCheck}>
            <div><Check size={15} /><span>{devicesReady ? "Microphone detected" : "Microphone permission needed"}</span></div>
            <div><Check size={15} /><span>{cameraAvailable ? "Camera detected" : "Camera optional or unavailable"}</span></div>
            <div><ShieldCheck size={15} /><span>Transcript stays in this browser</span></div>
          </div>

          {!listening ? (
            <button type="button" className={styles.beginButton} onClick={startInterview}>
              <Mic size={19} />Begin mock interview
            </button>
          ) : (
            <button type="button" className={`${styles.beginButton} ${styles.stopButton}`} onClick={stopInterview}>
              <Square size={17} />Stop and summarize
            </button>
          )}
          <p className={styles.setupNote}>{deviceMessage}</p>
        </aside>
      </section>

      <section className={styles.transcriptPanel}>
        <div className={styles.transcriptHeader}>
          <div>
            <p>Live transcript</p>
            <h2>Your interview conversation</h2>
          </div>
          <span>{entries.length} captured response{entries.length === 1 ? "" : "s"}</span>
        </div>
        <div className={styles.transcriptBody} aria-live="polite">
          {entries.length === 0 && !interimText ? (
            <div className={styles.transcriptEmpty}>
              <Mic size={23} />
              <p>Your spoken answers will appear here when the interview starts.</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className={styles.transcriptMessage}>
                <span>{candidateName.charAt(0).toUpperCase()}</span>
                <div>
                  <p>{entry.text}</p>
                  <time>{entry.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                </div>
              </div>
            ))
          )}
          {interimText ? (
            <div className={`${styles.transcriptMessage} ${styles.transcriptInterim}`}>
              <span>•••</span><div><p>{interimText}</p><time>Listening…</time></div>
            </div>
          ) : null}
        </div>
        {summary ? (
          <div className={styles.summaryBox}>
            <Sparkles size={18} />
            <div><strong>Session summary</strong><p>{summary}</p></div>
          </div>
        ) : null}
      </section>
    </>
  );
}
