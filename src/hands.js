import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11],
  [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

export async function createLandmarker() {
  const fileset = await FilesetResolver.forVisionTasks(WASM);
  return HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
    runningMode: "VIDEO",
    numHands: 2,
  });
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function countFingers(lm) {
  const wrist = lm[0];
  let n = 0;
  // index, middle, ring, pinky: tip farther from wrist than PIP joint
  for (const [tip, pip] of [[8, 6], [12, 10], [16, 14], [20, 18]])
    if (dist(lm[tip], wrist) > dist(lm[pip], wrist) * 1.1) n++;
  // thumb: tip farther from pinky base than thumb IP, and away from index base
  if (dist(lm[4], lm[17]) > dist(lm[3], lm[17]) * 1.05 && dist(lm[4], lm[5]) > dist(lm[2], lm[5]) * 0.9) n++;
  return n;
}

export function drawHand(ctx, lm, color, count) {
  const { width: W, height: H } = ctx.canvas;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  for (const [a, b] of BONES) {
    ctx.beginPath();
    ctx.moveTo(lm[a].x * W, lm[a].y * H);
    ctx.lineTo(lm[b].x * W, lm[b].y * H);
    ctx.stroke();
  }
  ctx.fillStyle = "#fff";
  for (const p of lm) {
    ctx.beginPath();
    ctx.arc(p.x * W, p.y * H, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // canvas is mirrored via CSS, so un-mirror the label
  ctx.save();
  ctx.translate(lm[0].x * W, lm[0].y * H + 40);
  ctx.scale(-1, 1);
  ctx.fillStyle = color;
  ctx.font = "bold 36px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(count, 0, 0);
  ctx.restore();
}
