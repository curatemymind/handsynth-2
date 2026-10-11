import { useCallback, useEffect, useRef, useState } from "react";
import { Synth } from "./synth.js";
import { createLandmarker, countFingers, drawHand } from "./hands.js";
import { CHORDS, KEYMAP } from "./music.js";
import Keyboard from "./components/Keyboard.jsx";
import ChordDisplay from "./components/ChordDisplay.jsx";
import Legend from "./components/Legend.jsx";

const STABLE_FRAMES = 4; // frames a finger count must hold before the chord changes
const COLORS = { L: "#ff7ab6", R: "#5be7c4" };

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const synthRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const handState = useRef({ L: { chord: 0, cand: 0, frames: 0 }, R: { chord: 0, cand: 0, frames: 0 } });

  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState("");
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState("");
  const [volume, setVolume] = useState(0.6);
  const [chords, setChords] = useState({ L: null, R: null });
  const [active, setActive] = useState(new Map());

  const startCamera = useCallback(async (deviceId) => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const size = { width: 1280, height: 720 };
    const stream = await navigator.mediaDevices.getUserMedia({
      video: deviceId ? { deviceId: { exact: deviceId }, ...size } : size,
      audio: false,
    });
    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    await videoRef.current.play();
    setCameraId(stream.getVideoTracks()[0].getSettings().deviceId ?? "");
    const devices = await navigator.mediaDevices.enumerateDevices();
    setCameras(devices.filter((d) => d.kind === "videoinput"));
  }, []);

  const start = async () => {
    setStarted(true);
    const synth = (synthRef.current = new Synth(volume));
    synth.subscribe(setActive);
    try {
      setStatus("Starting camera…");
      await startCamera();
      setStatus("Loading hand model…");
      landmarkerRef.current = await createLandmarker();
      setStatus("Ready — show your hands ✋");
    } catch (e) {
      console.error(e);
      setStatus("Error: " + (e.message || e));
    }
  };

  const changeCamera = (id) => {
    startCamera(id).catch((e) => setStatus("Error: " + (e.message || e)));
  };

  const setChord = useCallback((side, n) => {
    const s = handState.current[side];
    if (s.chord === n) return;
    const synth = synthRef.current;
    CHORDS[side][s.chord]?.notes.forEach((_, i) => synth.noteOff(`${side}${i}`));
    s.chord = n;
    const chord = CHORDS[side][n];
    chord?.notes.forEach((m, i) => synth.noteOn(`${side}${i}`, m));
    setChords((c) => ({ ...c, [side]: chord?.name ?? null }));
  }, []);

  // Hand tracking loop
  useEffect(() => {
    if (!started) return;
    let raf;
    let lastTime = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!landmarker || video.readyState < 2 || video.currentTime === lastTime) return;
      lastTime = video.currentTime;

      const canvas = canvasRef.current;
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const res = landmarker.detectForVideo(video, performance.now());
      const seen = { L: null, R: null };
      for (const lm of res.landmarks) {
        // video is mirrored on screen: right half of the screen = right hand
        const side = 1 - lm[0].x > 0.5 ? "R" : "L";
        if (seen[side]) continue;
        const count = countFingers(lm);
        seen[side] = { count, y: lm[9].y };
        drawHand(ctx, lm, COLORS[side], count);
      }

      for (const side of ["L", "R"]) {
        const s = handState.current[side];
        const count = seen[side]?.count ?? 0;
        if (count === s.cand) s.frames++;
        else {
          s.cand = count;
          s.frames = 1;
        }
        if (s.frames >= STABLE_FRAMES) setChord(side, s.cand);
      }

      const ys = [seen.L, seen.R].filter(Boolean).map((s) => s.y);
      if (ys.length) synthRef.current.setBrightness(Math.min(...ys));
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [started, setChord]);

  // Computer keyboard
  useEffect(() => {
    if (!started) return;
    const down = (e) => {
      const i = KEYMAP.indexOf(e.key.toLowerCase());
      if (i >= 0 && !e.repeat) synthRef.current.noteOn("kb" + i, 60 + i, 0.22);
    };
    const up = (e) => {
      const i = KEYMAP.indexOf(e.key.toLowerCase());
      if (i >= 0) synthRef.current.noteOff("kb" + i);
    };
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
    };
  }, [started]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close();
      synthRef.current?.close();
    },
    []
  );

  const onVolume = (v) => {
    setVolume(v);
    synthRef.current?.setVolume(v);
  };

  return (
    <div className="stage">
      <video ref={videoRef} playsInline muted />
      <canvas ref={canvasRef} className="overlay" />

      <div className="topbar">
        <div className="pill">
          📷{" "}
          <select value={cameraId} onChange={(e) => changeCamera(e.target.value)}>
            {cameras.map((c, i) => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
        <div className="pill">
          Vol{" "}
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => onVolume(+e.target.value)} />
        </div>
        <div className="pill status">{status}</div>
      </div>

      <ChordDisplay chords={chords} />
      <Legend />
      <Keyboard
        active={active}
        onDown={(m) => synthRef.current?.noteOn("mouse" + m, m, 0.22)}
        onUp={(m) => synthRef.current?.noteOff("mouse" + m)}
      />

      {!started && (
        <div className="gate">
          <div className="card">
            <h1>Hand Synth</h1>
            <p>Hold up fingers to play chords. Allow camera access when asked.</p>
            <button className="primary" onClick={start}>
              Start
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
