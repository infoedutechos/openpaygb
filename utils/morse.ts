// utils/morse.ts

/**
 * Morse code encoding/decoding for Daily Cipher.
 * Standard International Morse Code (letters A-Z, digits 0-9).
 */

const LETTER_TO_MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
  H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
  O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-',
  V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
};

const MORSE_TO_LETTER: Record<string, string> = Object.fromEntries(
  Object.entries(LETTER_TO_MORSE).map(([k, v]) => [v, k])
);

/** Convert word (e.g. "PEARLS") to Morse pattern with spaces (e.g. ".- .-.. --") */
export function wordToMorse(word: string): string {
  return word
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .split('')
    .map((c) => LETTER_TO_MORSE[c] ?? '')
    .filter(Boolean)
    .join(' ');
}

/** Convert Morse pattern (e.g. ".- .-.. --" or ". - . .-.. --") to word (e.g. "PEARLS") */
export function morseToWord(morse: string): string {
  const parts = morse.trim().split(/\s+/).filter(Boolean);
  return parts
    .map((p) => MORSE_TO_LETTER[p] ?? '')
    .filter(Boolean)
    .join('');
}

/** Normalize user input: dots/dashes or S/L format to standard Morse */
export function normalizeMorseInput(input: string): string {
  // Support: ".-" (dots/dashes), "SL" (S=short/dot, L=long/dash), or mixed
  let s = input.trim().toUpperCase();
  if (s.includes('S') || s.includes('L')) {
    s = s.replace(/S/g, '.').replace(/L/g, '-');
  }
  return s.replace(/\s+/g, ' ').trim();
}
