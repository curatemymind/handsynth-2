export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const isBlack = (m) => NOTE_NAMES[m % 12].includes("#");

// Finger count (1–5) → chord. MIDI 60 = C4.
export const CHORDS = {
  R: [
    null,
    { name: "C", notes: [48, 60, 64, 67] },
    { name: "Dm", notes: [50, 62, 65, 69] },
    { name: "Em", notes: [52, 64, 67, 71] },
    { name: "F", notes: [53, 65, 69, 72] },
    { name: "G", notes: [55, 67, 71, 74] },
  ],
  L: [
    null,
    { name: "Am", notes: [57, 60, 64, 69] },
    { name: "Bdim", notes: [59, 62, 65, 71] },
    { name: "Cmaj7", notes: [48, 64, 67, 71] },
    { name: "Dm7", notes: [50, 65, 69, 72] },
    { name: "G7", notes: [55, 65, 71, 74] },
  ],
};

export const KB_LOW = 48; // C3
export const KB_HIGH = 76; // E5
export const KEYMAP = "awsedftgyhujk"; // computer keys → C4..C5
