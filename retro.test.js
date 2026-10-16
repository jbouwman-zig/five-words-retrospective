import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  validateSubmission, encodeSubmission, decodeSubmission, importSubmissions,
  shuffleCards, emptySession, validateSession,
} from './retro.js';

const person = (id = 'person-001', name = 'Alex') => ({
  id, name, words: ['electric', 'foggy', 'momentum', 'detour', 'together'],
});

test('participant page has no host navigation or promotional slogans', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /href=["'][^"']*[?&]view=host|id=["']host-link/);
  assert.doesNotMatch(html, /One sprint\. No filter|Make some noise|Transmission|Less status\. More feeling/i);
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /host-link/);
});

test('submission codes round-trip Unicode, punctuation and HTML as plain text', () => {
  const value = { ...person(), name: 'Zoë <&>', words: ['café', '⚡', '你好', '"quoted"', '<script>'] };
  const code = encodeSubmission(value);
  assert.match(code, /^FW1\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeSubmission(code), value);
});

test('invalid fields and broken codes are explicitly rejected', () => {
  for (const value of [
    null, {}, { ...person(), id: 'bad' }, { ...person(), id: 12345678 }, { ...person(), name: ' ' },
    { ...person(), name: 'x'.repeat(33) }, { ...person(), words: ['one'] },
    { ...person(), words: [' ', 'a', 'b', 'c', 'd'] },
    { ...person(), words: ['x'.repeat(25), 'a', 'b', 'c', 'd'] },
  ]) assert.throws(() => validateSubmission(value));
  for (const code of ['', 'FW2.abc', 'FW1.!!!', 'FW1.a', 'FW1.e30', `FW1.${'a'.repeat(5000)}`]) {
    assert.throws(() => decodeSubmission(code));
  }
});

test('import adds, deduplicates, and updates by identity rather than display name', () => {
  const first = person();
  const second = person('person-002');
  const updated = { ...first, words: ['new', 'b', 'c', 'd', 'e'] };
  const result = importSubmissions([first], `${encodeSubmission(second)}\n ${encodeSubmission(updated)}`);
  assert.deepEqual(result, [updated, second]);
  assert.deepEqual(importSubmissions(result, encodeSubmission(updated)), result);
});

test('invalid batch leaves the original participants unchanged', () => {
  const original = [person()];
  const snapshot = structuredClone(original);
  assert.throws(() => importSubmissions(original, `${encodeSubmission(person('person-002'))}\ninvalid`));
  assert.deepEqual(original, snapshot);
  assert.throws(() => importSubmissions(original, ' \n '));
});

test('shuffle retains every word and avoids repeating an author when alternatives remain', () => {
  const participants = [person(), person('person-002'), person('person-003')];
  const snapshot = structuredClone(participants);
  for (let attempt = 0; attempt < 100; attempt++) {
    const cards = shuffleCards(participants);
    assert.equal(cards.length, 15);
    assert.deepEqual(cards.map(card => `${card.id}:${card.word}`).sort(),
      participants.flatMap(entry => entry.words.map(word => `${entry.id}:${word}`)).sort());
    cards.forEach((card, index) => {
      if (index && card.id === cards[index - 1].id) {
        assert.ok(cards.slice(index).every(remaining => remaining.id === card.id));
      }
    });
  }
  assert.deepEqual(participants, snapshot);
  assert.equal(shuffleCards([person()]).length, 5);
  assert.deepEqual(shuffleCards([]), []);
});

test('saved lobby, reveal and final screen survive serialization', () => {
  assert.deepEqual(validateSession(emptySession()), emptySession());
  for (const phase of ['reveal', 'end']) {
    const session = {
      participants: [person()], cards: shuffleCards([person()]), phase, index: 4, revealed: true,
    };
    assert.deepEqual(validateSession(JSON.parse(JSON.stringify(session))), session);
  }
});

test('corrupt saved sessions cannot restore invalid cards or positions', () => {
  const valid = { ...emptySession(), participants: [person()], cards: shuffleCards([person()]), phase: 'reveal' };
  for (const value of [
    null, { ...valid, index: -1 }, { ...valid, index: 5 }, { ...valid, index: NaN },
    { ...valid, cards: [] }, { ...valid, phase: 'unknown' },
    { ...valid, participants: [person(), person()] },
    { ...valid, cards: valid.cards.map(card => ({ ...card, name: 'Someone else' })) },
    { ...valid, phase: 'lobby' },
  ]) assert.throws(() => validateSession(value));
});
