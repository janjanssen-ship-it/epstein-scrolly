#!/usr/bin/env node
const fs = require('node:fs');

const css = fs.readFileSync('styles.css', 'utf8');
const messagesPayload = fs.readFileSync('data/messages.json', 'utf8');
const imageMapPayload = fs.readFileSync('data/image-map.json', 'utf8');

const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Das Protokoll</title>
    <style>${css}</style>
  </head>
  <body>
    <header class="article-header">
      <p class="kicker" id="article-kicker"></p>
      <h1 id="article-title"></h1>
      <p id="article-lede" class="lede"></p>
      <div id="intro-copy" class="intro-copy"></div>
    </header>

    <main class="scrolly-shell" aria-label="Nachrichtenverlauf">
      <div class="visual-layer" aria-live="polite">
        <div class="visual-frame">
          <img id="visual-image" alt="Dokumentvorschau" hidden />
          <div id="visual-placeholder" class="placeholder">
            <p>Dokumentvorschau folgt</p>
          </div>
        </div>
        <div class="meta-overlay">
          <p id="active-date" class="active-date"></p>
          <p class="progress-label">Fortschritt</p>
          <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="progress-track">
            <span id="progress-fill"></span>
          </div>
        </div>
      </div>

      <section id="steps" class="steps" aria-label="Einzelnachrichten"></section>
    </main>

    <template id="step-template">
      <article class="step" tabindex="0">
        <p class="step-date"></p>
        <p class="step-fromto"></p>
        <p class="step-message"></p>
        <div class="docs" aria-label="Dokumente"></div>
      </article>
    </template>

    <script>
      const PAYLOAD = ${messagesPayload};
      const IMAGE_MAP = ${imageMapPayload};

      const stepsRoot = document.getElementById('steps');
      const stepTemplate = document.getElementById('step-template');
      const kickerEl = document.getElementById('article-kicker');
      const titleEl = document.getElementById('article-title');
      const ledeEl = document.getElementById('article-lede');
      const introCopyEl = document.getElementById('intro-copy');
      const activeDateEl = document.getElementById('active-date');
      const progressTrack = document.getElementById('progress-track');
      const progressFill = document.getElementById('progress-fill');
      const visualImage = document.getElementById('visual-image');
      const visualPlaceholder = document.getElementById('visual-placeholder');

      const state = { messages: PAYLOAD.messages, imageMap: IMAGE_MAP };

      function renderIntro(intro) {
        kickerEl.textContent = intro.kicker;
        titleEl.textContent = intro.title;
        ledeEl.textContent = intro.lede;
        intro.intro_paragraphs.forEach((paragraph) => {
          const p = document.createElement('p');
          p.textContent = paragraph;
          introCopyEl.appendChild(p);
        });
      }

      function renderSteps(messages) {
        messages.forEach((item, index) => {
          const fragment = stepTemplate.content.cloneNode(true);
          const step = fragment.querySelector('.step');
          const date = fragment.querySelector('.step-date');
          const fromTo = fragment.querySelector('.step-fromto');
          const message = fragment.querySelector('.step-message');
          const docs = fragment.querySelector('.docs');

          step.dataset.id = item.id;
          step.dataset.index = String(index);

          date.textContent = item.date_label;
          fromTo.textContent = item.sender + ' an ' + item.recipient;
          message.textContent = item.message || '[Leere Nachricht]';

          item.documents.forEach((doc) => {
            const badge = document.createElement('a');
            badge.className = 'doc-badge';
            badge.textContent = doc;
            badge.href = 'Tchoumi/' + doc;
            badge.target = '_blank';
            badge.rel = 'noreferrer noopener';
            docs.appendChild(badge);
          });

          stepsRoot.appendChild(fragment);
        });
      }

      function updateVisual(message) {
        const mapped = state.imageMap[message.id] || [];
        if (mapped.length > 0) {
          visualImage.src = mapped[0];
          visualImage.hidden = false;
          visualPlaceholder.hidden = true;
        } else {
          visualImage.hidden = true;
          visualPlaceholder.hidden = false;
        }
      }

      visualImage.addEventListener('error', () => {
        visualImage.hidden = true;
        visualPlaceholder.hidden = false;
      });

      function setActive(index) {
        const steps = [...document.querySelectorAll('.step')];
        steps.forEach((step) => step.classList.remove('is-active'));

        const current = steps[index];
        if (!current) return;

        current.classList.add('is-active');

        const item = state.messages[index];
        activeDateEl.textContent = item.date_label;
        updateVisual(item);

        const progress = ((index + 1) / state.messages.length) * 100;
        progressFill.style.width = progress + '%';
        progressTrack.setAttribute('aria-valuenow', String(Math.round(progress)));
      }

      function setupObserver() {
        const steps = [...document.querySelectorAll('.step')];
        setActive(0);

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              const index = Number(entry.target.dataset.index);
              setActive(index);
            });
          },
          { root: null, threshold: 0.5, rootMargin: '-10% 0px -35% 0px' }
        );

        steps.forEach((step) => observer.observe(step));
      }

      renderIntro(PAYLOAD.intro);
      renderSteps(state.messages);
      setupObserver();
    </script>
  </body>
</html>`;

fs.writeFileSync('scrolly.html', html);
console.log('Wrote scrolly.html');
