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

let state = {
  messages: [],
  imageMap: {},
};

async function loadData() {
  const [messagesRes, imageMapRes] = await Promise.all([
    fetch('data/messages.json'),
    fetch('data/image-map.json'),
  ]);

  const messagePayload = await messagesRes.json();
  const imageMapPayload = await imageMapRes.json();

  state.messages = messagePayload.messages;
  state.imageMap = imageMapPayload;

  renderIntro(messagePayload.intro);
  renderSteps(state.messages);
  setupObserver();
}

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
    fromTo.textContent = `${item.sender} an ${item.recipient}`;
    message.textContent = item.message || '[Leere Nachricht]';

    item.documents.forEach((doc) => {
      const badge = document.createElement('a');
      badge.className = 'doc-badge';
      badge.textContent = doc;
      badge.href = `Tchoumi/${doc}`;
      badge.target = '_blank';
      badge.rel = 'noreferrer noopener';
      docs.appendChild(badge);
    });

    if (item.parse_flags.length > 0) {
      step.setAttribute('data-flagged', 'true');
    }

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
  progressFill.style.width = `${progress}%`;
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
    {
      root: null,
      threshold: 0.5,
      rootMargin: '-10% 0px -35% 0px',
    }
  );

  steps.forEach((step) => observer.observe(step));
}

loadData().catch((err) => {
  console.error(err);
  stepsRoot.innerHTML = '<p>Laden fehlgeschlagen.</p>';
});
