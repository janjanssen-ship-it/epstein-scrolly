#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const messagesPath = process.argv[2] || path.join('data', 'messages.json');
const previewsDir = process.argv[3] || path.join('assets', 'previews');
const outPath = process.argv[4] || path.join('data', 'image-map.json');

const payload = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
const map = {};
const textScoreCache = new Map();

function resolveExistingPreviewPaths(documents) {
  const candidates = documents.map((doc) => {
    const base = doc.replace(/\.pdf$/i, '');
    return `assets/previews/${base}.jpg`;
  });
  return candidates.filter((candidate) => fs.existsSync(path.resolve(candidate)));
}

function pdfTextScore(docFilename) {
  if (textScoreCache.has(docFilename)) {
    return textScoreCache.get(docFilename);
  }

  const absPdf = path.resolve('Tchoumi', docFilename);
  if (!fs.existsSync(absPdf)) {
    textScoreCache.set(docFilename, -1);
    return -1;
  }

  const result = spawnSync('strings', [absPdf], { encoding: 'utf8' });
  if (result.status !== 0 || !result.stdout) {
    textScoreCache.set(docFilename, -1);
    return -1;
  }

  const score = (result.stdout.match(/[A-Za-zÄÖÜäöüß]{3,}/g) || []).length;
  textScoreCache.set(docFilename, score);
  return score;
}

function bestExisting(documents) {
  const existing = resolveExistingPreviewPaths(documents);
  if (existing.length === 0) return [];

  let bestPath = existing[0];
  let bestScore = -1;

  for (const imagePath of existing) {
    const docName = `${path.basename(imagePath, '.jpg')}.pdf`;
    const score = pdfTextScore(docName);
    if (score > bestScore) {
      bestScore = score;
      bestPath = imagePath;
    }
  }

  return [bestPath];
}

const messages = payload.messages;

if (messages.length >= 1) {
  map[messages[0].id] = bestExisting(messages[0].documents);
}

if (messages.length >= 2) {
  map[messages[1].id] = bestExisting(messages[1].documents);
}

let i = 2;
while (i < messages.length) {
  const anchor = messages[i];
  const chosen = bestExisting(anchor.documents);
  const end = Math.min(i + 5, messages.length);

  for (let j = i; j < end; j += 1) {
    map[messages[j].id] = chosen;
  }

  i = end;
}

fs.writeFileSync(outPath, JSON.stringify(map, null, 2));
process.stdout.write(`Mapped ${Object.keys(map).length} messages.\n`);
