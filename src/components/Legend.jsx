import { CHORDS } from "../music.js";

const list = (side) => CHORDS[side].slice(1).map((c, i) => `${i + 1} ${c.name}`).join(" · ");

export default function Legend() {
  return (
    <div className="legend">
      <div><b>Right hand</b> (fingers up)</div>
      <div>{list("R")}</div>
      <div className="gap"><b>Left hand</b></div>
      <div>{list("L")}</div>
      <div className="gap">Fist = silence · hand height = brightness</div>
      <div>Keys A–K play the keyboard</div>
    </div>
  );
}
