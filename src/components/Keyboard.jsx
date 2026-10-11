import { useMemo } from "react";
import { NOTE_NAMES, KB_LOW, KB_HIGH, isBlack } from "../music.js";

export default function Keyboard({ active, onDown, onUp }) {
  const { whites, blacks } = useMemo(() => {
    const whites = [];
    const blacks = [];
    for (let m = KB_LOW; m <= KB_HIGH; m++) (isBlack(m) ? blacks : whites).push(m);
    return { whites, blacks };
  }, []);
  const w = 100 / whites.length;

  const keyProps = (m) => {
    const side = active.get(m);
    return {
      key: m,
      className: `${isBlack(m) ? "black" : "white"}${side ? " on" : ""}${side === "L" ? " L" : ""}`,
      onPointerDown: (e) => {
        e.preventDefault();
        onDown(m);
      },
      onPointerUp: () => onUp(m),
      onPointerLeave: () => onUp(m),
    };
  };

  return (
    <div className="keyboard">
      <div className="keys">
        {whites.map((m) => (
          <div {...keyProps(m)}>{NOTE_NAMES[m % 12] === "C" ? `C${Math.floor(m / 12) - 1}` : ""}</div>
        ))}
        {blacks.map((m) => (
          <div
            {...keyProps(m)}
            style={{ left: `${(whites.indexOf(m - 1) + 1) * w - w * 0.3}%`, width: `${w * 0.6}%` }}
          />
        ))}
      </div>
    </div>
  );
}
