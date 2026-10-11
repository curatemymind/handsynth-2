export default function ChordDisplay({ chords }) {
  return (
    <div className="chords">
      {[["L", "Left hand"], ["R", "Right hand"]].map(([side, label]) => (
        <div key={side} className={`chord ${side}${chords[side] ? " on" : ""}`}>
          <div className="side">{label}</div>
          <div className="name">{chords[side] ?? "–"}</div>
        </div>
      ))}
    </div>
  );
}
