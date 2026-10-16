# Five Words

A small, English-language sprint retrospective. Everyone writes five words on
their phone, sends a submission code privately to the host, and the team guesses
who wrote each word. No backend, accounts, dependencies, or build step.

## Publish on GitHub Pages

1. Create a GitHub repository and upload this project, including
   `.github/workflows/pages.yml`. Use `main` as the default branch.
2. In the repository, open **Settings → Pages → Build and deployment** and set
   **Source** to **GitHub Actions**.
3. Push to `main`, or open **Actions → Deploy to GitHub Pages → Run workflow**.
4. Open the published URL shown in the deployment, usually
   `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

All asset URLs are relative, so both repository sites and custom domains work.
Only the static site files and bundled fonts are deployed. No PHP hosting is
needed. If you use a branch other than `main`, change the workflow branch filter.

## Run a retro

1. On the presentation laptop, choose **Host a retro** (`?view=host`).
2. Share the participant address shown on that page.
3. Each participant enters their name and five words, then chooses
   **Generate my code** and **Copy code**.
4. They send that code **privately** to the host, for example in a direct message.
5. Paste one or more codes into the host desk and choose **Import codes**.
   Spaces or new lines can separate codes. A damaged code rejects the entire
   batch without changing the list.
6. Once everyone is listed, choose **Start the reveal**. Importing is closed.
7. Guess the author, choose **Who said it?**, and move through the words.
   The final screen groups all words by participant.

There is deliberately **no live phone-to-host connection**. Generating a code
does not submit anything automatically. Participants can edit their words and
send an updated code before the reveal; importing it replaces their previous
entry. Different participants can have the same name without being merged.
Use separate browser profiles for different people sharing one device, or finish
and import one entry before clearing the participant page's site storage.

### Presentation keys

| Key | Action |
| --- | --- |
| Space, →, Page Down | Next word / finish |
| ←, Page Up | Previous word |
| N | Show / hide author |
| F | Enter / leave fullscreen, where supported |

Shortcuts do not override focused inputs, buttons, or links. A refresh restores
the imported entries, shuffled order, current word, revealed name, and final
screen in the same browser. **New retro** deletes the host's imported words after
confirmation; it does not delete participant copies or private messages.

## Local use and checks

Serve the directory with any static HTTP server and open `index.html` through
that server, not a `file://` URL. HTTPS is recommended when hosting; clipboard
and identity generation also work on `localhost`.

With Node.js 22 or newer:

```sh
npm run check
npm test
```

There are no packages to install.

## Privacy and limitations

- Codes contain the name and words. They are encoded, **not encrypted**. Anyone
  with a code can decode it; do not post codes in a shared channel.
- Data is saved in this browser's local storage, not in GitHub or a remote
  database. Private-browsing sessions or clearing site storage can delete it.
- Use one host tab and one host device per retro. There is no cross-device or
  cross-tab synchronization, authentication, or protection from someone using
  the same browser profile. Codes are not tied to a room: import only codes for
  the current retro.
- The host can inspect imported data in browser developer tools. The hidden
  words are a game mechanic, not a security boundary.
- Names are limited to 32 characters; each of the five word fields is limited
  to 24 characters. Short phrases are allowed, as in the original tool.
- The former PHP version's shared session and presentation-code gate are
  replaced by manual code import and browser-local storage. Old sessions are
  not migrated.

## Visual direction

An original Romance-inspired treatment: soft pink and lavender gradients,
acid-green accents, clean condensed sans-serif headlines, translucent panels, and an abstract
original vector heart with soft shading and highlights. No album artwork, band logo, lyrics, or third-party
photographs are used or loaded.

Anton is used for the headlines and bundled in `fonts/` under the SIL Open Font
License (`fonts/anton-OFL.txt`). All runtime assets are local; there are no
analytics, external font requests, or network API calls.
