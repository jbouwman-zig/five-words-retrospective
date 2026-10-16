export const WORD_COUNT = 5;
export const MAX_NAME_LENGTH = 32;
export const MAX_WORD_LENGTH = 24;
const CODE_PREFIX = 'FW1.';
const ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

export function validateSubmission(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !ID_PATTERN.test(value.id)) {
    throw new Error('Invalid submission identity. Generate a new code on the participant page.');
  }
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > MAX_NAME_LENGTH) {
    throw new Error(`Enter a name of up to ${MAX_NAME_LENGTH} characters.`);
  }
  if (!Array.isArray(value.words) || value.words.length !== WORD_COUNT ||
      value.words.some(word => typeof word !== 'string' || !word.trim() || word.length > MAX_WORD_LENGTH)) {
    throw new Error(`Enter exactly ${WORD_COUNT} words, each up to ${MAX_WORD_LENGTH} characters.`);
  }
  return {
    id: value.id,
    name: value.name.trim(),
    words: value.words.map(word => word.trim()),
  };
}

export function encodeSubmission(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(validateSubmission(value)));
  return CODE_PREFIX + btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodeSubmission(code) {
  if (!code.startsWith(CODE_PREFIX) || code.length > 4096 ||
      !/^[A-Za-z0-9_-]+$/.test(code.slice(CODE_PREFIX.length))) {
    throw new Error('Invalid submission code. Paste the complete code starting with FW1.');
  }
  let value;
  try {
    const bytes = Uint8Array.from(atob(code.slice(CODE_PREFIX.length).replaceAll('-', '+').replaceAll('_', '/')),
      character => character.charCodeAt(0));
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('This submission code is damaged. Ask the participant to copy it again.');
  }
  return validateSubmission(value);
}

export function importSubmissions(participants, text) {
  const codes = text.trim().split(/\s+/);
  if (!text.trim()) throw new Error('Paste at least one submission code.');
  // Decode the whole batch before changing anything.
  const incoming = codes.map(decodeSubmission);
  const merged = new Map(participants.map(person => [person.id, person]));
  incoming.forEach(person => merged.set(person.id, person));
  return [...merged.values()];
}

export function shuffleCards(participants, random = Math.random) {
  const piles = participants.map(person => ({
    id: person.id,
    cards: person.words.map(word => ({ id: person.id, name: person.name, word })),
  }));
  for (const { cards } of piles) {
    for (let index = cards.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [cards[index], cards[other]] = [cards[other], cards[index]];
    }
  }
  const result = [];
  while (piles.some(pile => pile.cards.length)) {
    const available = piles.filter(pile => pile.cards.length);
    const alternatives = available.filter(pile => pile.id !== result.at(-1)?.id);
    const candidates = alternatives.length ? alternatives : available;
    const total = candidates.reduce((sum, pile) => sum + pile.cards.length, 0);
    let choice = random() * total;
    const pile = candidates.find(candidate => (choice -= candidate.cards.length) < 0);
    result.push(pile.cards.pop());
  }
  return result;
}

export function emptySession() {
  return { participants: [], cards: [], phase: 'lobby', index: 0, revealed: false };
}

export function validateSession(value) {
  if (!value || !Array.isArray(value.participants) || !Array.isArray(value.cards) ||
      !['lobby', 'reveal', 'end'].includes(value.phase) ||
      !Number.isInteger(value.index) || value.index < 0 || typeof value.revealed !== 'boolean') {
    throw new Error('The saved retro is invalid.');
  }
  const participants = value.participants.map(validateSubmission);
  if (new Set(participants.map(person => person.id)).size !== participants.length) {
    throw new Error('The saved retro contains duplicate identities.');
  }
  const expected = participants.flatMap(person => person.words.map(word =>
    JSON.stringify([person.id, person.name, word]))).sort();
  const actual = value.cards.map(card => JSON.stringify([card?.id, card?.name, card?.word])).sort();
  if (value.phase === 'lobby' ? value.cards.length !== 0 :
    !actual.length || JSON.stringify(actual) !== JSON.stringify(expected) ||
    value.index >= value.cards.length) {
    throw new Error('The saved reveal is invalid.');
  }
  return { ...value, participants };
}
