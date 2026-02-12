#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const inputPath = process.argv[2] || path.join('content', 'article.txt');
const outputPath = process.argv[3] || path.join('data', 'messages.json');

const monthMap = {
  januar: '01',
  februar: '02',
  maerz: '03',
  märz: '03',
  april: '04',
  mai: '05',
  juni: '06',
  juli: '07',
  august: '08',
  september: '09',
  oktober: '10',
  november: '11',
  dezember: '12',
};

function normalizeMonth(input) {
  return input.toLowerCase().replace('ä', 'ae');
}

function parseDate(line) {
  const match = line.match(/^(\d{1,2})\.\s+([A-Za-zÄÖÜäöü]+)\s+(\d{4})(?:\s*\((.+)\))?\s*$/);
  if (!match) return null;

  const day = match[1].padStart(2, '0');
  const monthRaw = normalizeMonth(match[2]);
  const month = monthMap[monthRaw] || monthMap[match[2].toLowerCase()];
  if (!month) return null;

  const year = match[3];
  return {
    date_label: `${match[1]}. ${match[2]} ${year}`,
    date_iso: `${year}-${month}-${day}`,
    date_note: match[4] || null,
  };
}

function pickLine(lines, label) {
  const row = lines.find((line) => line.startsWith(`${label}:`));
  if (!row) return null;
  return row.replace(`${label}:`, '').trim();
}

function extractDocuments(lines) {
  return Array.from(
    new Set(
      lines
        .join(' ')
        .match(/EFTA\d+\.pdf/g) || []
    )
  );
}

function extractMessage(lines, flags) {
  const msgLine = lines.find((line) => line.startsWith('Nachricht:'));
  if (msgLine) return msgLine.replace('Nachricht:', '').trim();

  const recipientIdx = lines.findIndex((line) => line.startsWith('Empfänger:'));
  const docIdx = lines.findIndex((line) => line.startsWith('Dokument:'));

  if (recipientIdx >= 0 && docIdx > recipientIdx + 1) {
    flags.push('inferred_message_label');
    return lines
      .slice(recipientIdx + 1, docIdx)
      .join(' ')
      .trim();
  }

  flags.push('missing_message');
  return '';
}

function splitBlocks(lines) {
  const blocks = [];
  let current = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }
      continue;
    }

    if (parseDate(line)) {
      if (current.length > 0) blocks.push(current);
      current = [line];
      continue;
    }

    if (line.startsWith('Absender:') && current.length > 0) {
      blocks.push(current);
      current = [line];
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) blocks.push(current);
  return blocks;
}

function parse(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  let firstDateIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (parseDate(lines[i].trim())) {
      firstDateIndex = i;
      break;
    }
  }

  if (firstDateIndex === -1) {
    throw new Error('Kein Datumsblock gefunden.');
  }

  const introLines = lines
    .slice(0, firstDateIndex)
    .map((line) => line.trim())
    .filter(Boolean);

  const bodyLines = lines.slice(firstDateIndex);

  const bodyExpanded = [];
  for (const line of bodyLines) {
    const split = line.split(/(?=(?:^|\s)\d{1,2}\.\s+[A-Za-zÄÖÜäöü]+\s+\d{4})/g);
    if (split.length > 1) {
      split.forEach((item) => {
        const v = item.trim();
        if (v) bodyExpanded.push(v);
      });
    } else {
      bodyExpanded.push(line);
    }
  }

  const messages = [];
  let currentDate = null;

  const blocks = splitBlocks(bodyExpanded);
  let counter = 1;

  for (const block of blocks) {
    const maybeDate = parseDate(block[0]);
    if (maybeDate) {
      currentDate = maybeDate;
      if (block.length === 1) continue;
      block.shift();
    }

    if (!block[0]?.startsWith('Absender:')) continue;

    if (!currentDate) {
      throw new Error('Nachricht ohne vorherigen Datumsblock gefunden.');
    }

    const parse_flags = [];
    const sender = pickLine(block, 'Absender');
    const recipient = pickLine(block, 'Empfänger');
    const message = extractMessage(block, parse_flags);
    const documents = extractDocuments(block);

    if (!sender) parse_flags.push('missing_sender');
    if (!recipient) parse_flags.push('missing_recipient');
    if (documents.length === 0) parse_flags.push('missing_documents');

    messages.push({
      id: `msg-${String(counter).padStart(3, '0')}`,
      date_iso: currentDate.date_iso,
      date_label: currentDate.date_label,
      sender: sender || '',
      recipient: recipient || '',
      message,
      documents,
      parse_flags,
    });

    counter += 1;
  }

  return {
    intro: {
      kicker: introLines[0] || '',
      title: introLines[1] || '',
      lede: introLines[2] || '',
      intro_paragraphs: introLines.slice(3),
    },
    messages,
  };
}

function main() {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const parsed = parse(raw);
  fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2));

  const flagged = parsed.messages.filter((m) => m.parse_flags.length > 0).length;
  process.stdout.write(`Parsed ${parsed.messages.length} messages (${flagged} flagged).\n`);
}

main();
