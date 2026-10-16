import {
  WORD_COUNT, MAX_WORD_LENGTH, encodeSubmission, validateSubmission,
  importSubmissions, shuffleCards, emptySession, validateSession,
} from './retro.js';

const $ = id => document.getElementById(id);
const host = new URLSearchParams(location.search).get('view') === 'host';
const HOST_KEY = 'five-words.host.v1';
const ENTRY_KEY = 'five-words.entry.v1';
let session = emptySession();
let submission;

function showError(error) {
  $('error').textContent = error.message;
  $('error').hidden = false;
  $('error').scrollIntoView({ block: 'nearest' });
}

function run(action) {
  return async event => {
    if (event?.type !== 'keydown') event?.preventDefault();
    $('error').hidden = true;
    try {
      await action(event);
    } catch (error) {
      showError(error);
    }
  };
}

function load(key, validate) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch {
    throw new Error('Browser storage is unavailable. Allow site storage and reload before using this tool.');
  }
  if (raw === null) return null;
  try {
    return validate(JSON.parse(raw));
  } catch {
    throw new Error('Saved browser data could not be read. Clear this site’s storage to start again. This will delete its saved words.');
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error('Could not save to this browser. Free up storage or allow site storage, then try again. The change was not saved.');
  }
}

function commit(next) {
  save(HOST_KEY, next);
  session = next;
  renderHost();
}

function renderSubmission() {
  $('entry').hidden = true;
  $('submission').hidden = false;
  $('submission-code').value = encodeSubmission(submission);
  $('submitted-words').replaceChildren(...submission.words.map(word => {
    const item = document.createElement('li');
    item.textContent = word;
    return item;
  }));
  $('copy-status').textContent = '';
}

function renderHost() {
  for (const phase of ['lobby', 'reveal', 'end']) $(phase).hidden = phase !== session.phase;
  document.body.classList.toggle('presenting', session.phase === 'reveal');
  if (session.phase === 'lobby') {
    const count = session.participants.length;
    $('participant-count').textContent = `${count} ${count === 1 ? 'person' : 'people'} / ${count * WORD_COUNT} words`;
    $('start').disabled = count === 0;
    const entries = session.participants.map(person => {
      const item = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = person.name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove';
      remove.textContent = 'Remove ×';
      remove.setAttribute('aria-label', `Remove ${person.name}`);
      remove.addEventListener('click', run(() =>
        commit({ ...session, participants: session.participants.filter(entry => entry.id !== person.id) })));
      item.append(name, remove);
      return item;
    });
    if (!entries.length) {
      const empty = document.createElement('li');
      empty.textContent = 'Quiet for now. Import the first code.';
      entries.push(empty);
    }
    $('participants').replaceChildren(...entries);
  } else if (session.phase === 'reveal') {
    const card = session.cards[session.index];
    $('word').textContent = card.word;
    $('progress').textContent = `${String(session.index + 1).padStart(2, '0')} / ${session.cards.length} words`;
    $('author').textContent = session.revealed ? card.name : 'A familiar mind. An unfamiliar word.';
    $('author').classList.toggle('revealed', session.revealed);
    $('toggle-author').textContent = session.revealed ? 'Hide name' : 'Who said it?';
    $('previous').disabled = session.index === 0;
    $('next').textContent = session.index === session.cards.length - 1 ? 'Finish ↗' : 'Next →';
    requestAnimationFrame(fitWord);
  } else {
    $('summary').replaceChildren(...session.participants.map(person => {
      const article = document.createElement('article');
      const heading = document.createElement('h2');
      heading.textContent = person.name;
      const list = document.createElement('ul');
      person.words.forEach(word => {
        const item = document.createElement('li');
        item.textContent = word;
        list.append(item);
      });
      article.append(heading, list);
      return article;
    }));
  }
}

function fitWord() {
  if (session.phase !== 'reveal') return;
  const word = $('word');
  word.style.fontSize = '';
  const available = word.parentElement.clientWidth;
  if (word.scrollWidth > available) {
    word.style.fontSize = `${parseFloat(getComputedStyle(word).fontSize) * available / word.scrollWidth}px`;
  }
}

function nextWord(direction) {
  if (session.phase !== 'reveal') return;
  const index = session.index + direction;
  if (index < 0) return;
  commit(index >= session.cards.length
    ? { ...session, phase: 'end', revealed: false }
    : { ...session, index, revealed: false });
}

function toggleAuthor() {
  if (session.phase === 'reveal') commit({ ...session, revealed: !session.revealed });
}

function reset() {
  if (confirm('Delete all imported words and start a new retro? This cannot be undone.')) {
    commit(emptySession());
    $('import-status').textContent = '';
    $('import-codes').value = '';
  }
}

async function fullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen();
  else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
  else throw new Error('Fullscreen is not supported in this browser.');
}

async function initialize() {
  $('participant-link').setAttribute('aria-current', host ? 'false' : 'page');
  $('host-link').setAttribute('aria-current', host ? 'page' : 'false');
  if (host) {
    session = load(HOST_KEY, validateSession) ?? emptySession();
    // Verify persistence before accepting any submissions.
    save(HOST_KEY, session);
    const join = new URL('./', location.href);
    $('join-url').href = join.href;
    $('join-url').textContent = join.href;
    $('host-view').hidden = false;
    renderHost();
    $('import-form').addEventListener('submit', run(() => {
      if (session.phase !== 'lobby') throw new Error('The reveal has started. Start a new retro to import codes.');
      const participants = importSubmissions(session.participants, $('import-codes').value);
      commit({ ...session, participants });
      $('import-codes').value = '';
      $('import-status').textContent = 'Codes imported. The list below is up to date.';
    }));
    $('start').addEventListener('click', run(() => {
      if (session.phase !== 'lobby' || !session.participants.length) return;
      commit({ ...session, cards: shuffleCards(session.participants), phase: 'reveal', index: 0, revealed: false });
    }));
    $('previous').addEventListener('click', run(() => nextWord(-1)));
    $('next').addEventListener('click', run(() => nextWord(1)));
    $('toggle-author').addEventListener('click', run(toggleAuthor));
    $('replay').addEventListener('click', run(() =>
      commit({ ...session, phase: 'reveal', index: 0, revealed: false })));
    $('reset-lobby').addEventListener('click', run(reset));
    $('reset-end').addEventListener('click', run(reset));
    document.addEventListener('keydown', run(async event => {
      if (event.target.closest('input, textarea, button, a, [contenteditable]') || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        return fullscreen();
      }
      if (session.phase !== 'reveal') return;
      if ([' ', 'ArrowRight', 'PageDown', 'ArrowLeft', 'PageUp', 'n', 'N'].includes(event.key)) {
        event.preventDefault();
        if ([' ', 'ArrowRight', 'PageDown'].includes(event.key)) nextWord(1);
        else if (['ArrowLeft', 'PageUp'].includes(event.key)) nextWord(-1);
        else toggleAuthor();
      }
    }));
    window.addEventListener('resize', fitWord);
    await document.fonts.ready;
    fitWord();
  } else {
    submission = load(ENTRY_KEY, validateSubmission);
    const placeholders = ['electric', 'foggy', 'momentum', 'detour', 'together'];
    for (let index = 0; index < WORD_COUNT; index++) {
      const label = document.createElement('label');
      label.textContent = `Word ${String(index + 1).padStart(2, '0')}`;
      const input = document.createElement('input');
      input.name = `word-${index}`;
      input.required = true;
      input.maxLength = MAX_WORD_LENGTH;
      input.placeholder = placeholders[index];
      input.autocomplete = 'off';
      input.autocapitalize = 'none';
      input.spellcheck = false;
      label.append(input);
      $('word-fields').append(label);
    }
    const form = $('word-form');
    if (submission) {
      form.elements.namedItem('name').value = submission.name;
      submission.words.forEach((word, index) => { form.elements.namedItem(`word-${index}`).value = word; });
      renderSubmission();
    }
    $('participant-view').hidden = false;
    form.addEventListener('submit', run(() => {
      const value = validateSubmission({
        id: submission?.id ?? crypto.randomUUID(),
        name: form.elements.namedItem('name').value,
        words: Array.from({ length: WORD_COUNT }, (_, index) => form.elements.namedItem(`word-${index}`).value),
      });
      save(ENTRY_KEY, value);
      submission = value;
      renderSubmission();
    }));
    $('edit-words').addEventListener('click', () => {
      $('submission').hidden = true;
      $('entry').hidden = false;
      form.elements.namedItem('name').focus();
    });
    $('copy-code').addEventListener('click', run(async () => {
      $('submission-code').select();
      if (!navigator.clipboard?.writeText) {
        $('copy-status').textContent = 'Code selected. Use your browser’s Copy command, then send it privately to the host.';
        return;
      }
      try {
        await navigator.clipboard.writeText($('submission-code').value);
      } catch {
        throw new Error('Clipboard access was denied. The code is selected: copy it manually and send it privately to the host.');
      }
      $('copy-status').textContent = 'Copied. Send it privately to the host to complete your submission.';
    }));
  }
}

run(initialize)();
