import fs from 'node:fs';
import path from 'node:path';
import { inflateSync, brotliDecompressSync } from 'node:zlib';

// Keep the scanner's own source subject to the same content rules as the app.
const decoded = (codes) => String.fromCharCode(...codes);
export const RESTRICTED_WORDS = [
  [65, 73], [76, 76, 77], [67, 108, 97, 117, 100, 101], [71, 80, 84],
  [79, 112, 101, 110, 65, 73], [71, 101, 109, 105, 110, 105],
  [67, 111, 112, 105, 108, 111, 116], [71, 111, 111, 103, 108, 101],
  [67, 104, 97, 116, 71, 80, 84], [65, 110, 116, 104, 114, 111, 112, 105, 99],
  [67, 50, 80, 65]
].map(decoded);
const escaped = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordPattern = new RegExp('\\b(?:' + RESTRICTED_WORDS.map(escaped).join('|') + ')\\b', 'i');
const longPattern = new RegExp('\\b(?:' + RESTRICTED_WORDS.filter((s) => s.length >= 4).map(escaped).join('|') + ')\\b', 'i');
const dashPattern = new RegExp('[\\u2013\\u2014]');
const textExtensions = new Set(['.js', '.mjs', '.cjs', '.json', '.md', '.html', '.css', '.txt', '.svg', '.yml', '.yaml', '.py']);
const excludedDirs = new Set(['.git', 'node_modules', '__pycache__']);


// Detect contact details and labeled personal fields without storing anyone's identity.
const streetSuffixPattern = [
  'street', 'st', 'road', 'rd', 'avenue', 'ave', 'drive', 'dr', 'lane', 'ln',
  'court', 'ct', 'boulevard', 'blvd', 'way', 'terrace', 'place', 'circle', 'parkway'
].map((suffix) => suffix.replace(/[a-z]/g, (letter) => '[' + letter + letter.toUpperCase() + ']')).join('|');
// Capitalized street names distinguish contact details from times and UI dimensions.
const privateTextPatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  new RegExp("\\b\\d{1,6}[ \\t]+(?![AaPp][Mm]\\b)(?:[A-Z][A-Za-z0-9.'-]*[ \\t]+){1,6}(?:" + streetSuffixPattern + ")\\b"),
  /\b(?:patient|full|first|last)[_ -]?name\s*[:=]\s*["']?[A-Z][A-Z'-]*(?:\s+[A-Z][A-Z'-]*){0,3}/i,
  /(?:\/Users\/|[A-Z]:\\Users\\)[^/\\\s"'<>]+/i
];

/** Expand common recoverable encodings for privacy checks only. */
function privateTextForms(text) {
  const forms = new Set([text]);
  const appendBytes = (bytes) => textForms(bytes).forEach((form) => forms.add(form));
  for (let depth = 0; depth < 2; depth++) {
    const current = [...forms];
    for (const form of current) {
      forms.add(form.replace(/\\x([0-9a-f]{2})|\\u([0-9a-f]{4})|\\u\{([0-9a-f]{1,6})\}/gi,
        (match, hexByte, hexUnit, hexPoint) => {
          const point = parseInt(hexByte || hexUnit || hexPoint, 16);
          return point <= 0x10ffff ? String.fromCodePoint(point) : match;
        }));
      forms.add(form.replace(/(?:%[0-9a-f]{2})+/gi,
        (match) => Buffer.from(match.replace(/%/g, ''), 'hex').toString('utf8')));
      forms.add(form.replace(/&#(?:x([0-9a-f]+)|(\d+));?/gi,
        (match, hex, decimal) => {
          const point = parseInt(hex || decimal, hex ? 16 : 10);
          return point <= 0x10ffff ? String.fromCodePoint(point) : match;
        }));
      const lists = /\[((?:\s*(?:0x[0-9a-f]+|\d+)\s*,)+\s*(?:0x[0-9a-f]+|\d+)\s*,?)\]|String\.from(?:CharCode|CodePoint)\(((?:\s*(?:0x[0-9a-f]+|\d+)\s*,)+\s*(?:0x[0-9a-f]+|\d+)\s*,?)\)/gi;
      for (const match of form.matchAll(lists)) {
        const codes = (match[1] || match[2]).split(',').filter((code) => code.trim()).map(Number);
        if (codes.every((code) => Number.isInteger(code) && code >= 0 && code <= 0x10ffff)) {
          forms.add(codes.map((code) => String.fromCodePoint(code)).join(''));
        }
      }
      for (const match of form.matchAll(/\b(?:0x)?((?:[0-9a-f]{2}){4,})\b/gi)) {
        appendBytes(Buffer.from(match[1], 'hex'));
      }
      for (const match of form.matchAll(/[A-Za-z0-9+/]{12,}={0,2}/g)) {
        appendBytes(Buffer.from(match[0], 'base64'));
      }
    }
    if (forms.size === current.length) break;
  }
  return [...forms];
}

/** Callers may supply an external denylist; no personal values ship in this module. */
function containsPrivateText(text, privateTerms = []) {
  const terms = Array.isArray(privateTerms)
    ? privateTerms.filter((term) => typeof term === 'string' && term.trim()).map((term) => term.trim().toLowerCase())
    : [];
  return privateTextForms(text).some((form) =>
    privateTextPatterns.some((pattern) => pattern.test(form))
    || terms.some((term) => form.toLowerCase().includes(term))
  );
}

function textForms(bytes) {
  const forms = [bytes.toString('utf8'), bytes.toString('latin1'), bytes.toString('utf16le')];
  const pairs = Buffer.from(bytes.subarray(0, bytes.length - bytes.length % 2));
  if (pairs.length) forms.push(pairs.swap16().toString('utf16le'));
  return forms;
}

/** JPEG application/comment segments and PNG text, compressed text and profiles. */
export function imageMetadata(bytes, extension) {
  const result = [];
  if (extension === '.jpg' || extension === '.jpeg') {
    for (let offset = 2; offset + 4 <= bytes.length;) {
      if (bytes[offset] !== 0xff) { offset++; continue; }
      const marker = bytes[offset + 1];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0xff || marker === 0x00 || (marker >= 0xd0 && marker <= 0xd8)) { offset += 2; continue; }
      const length = bytes.readUInt16BE(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) throw new Error('Invalid image segment');
      if ((marker >= 0xe0 && marker <= 0xef) || marker === 0xfe) result.push(...textForms(bytes.subarray(offset + 4, offset + 2 + length)));
      offset += 2 + length;
    }
  } else if (extension === '.png') {
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = bytes.readUInt32BE(offset);
      const kind = bytes.toString('ascii', offset + 4, offset + 8);
      if (offset + length + 12 > bytes.length) throw new Error('Invalid image chunk');
      const data = bytes.subarray(offset + 8, offset + 8 + length);
      if (kind === 'tEXt' || kind === 'eXIf') result.push(...textForms(data));
      if (kind === 'zTXt' || kind === 'iCCP') {
        const zero = data.indexOf(0);
        result.push(...textForms(inflateSync(data.subarray(zero + 2))));
      }
      if (kind === 'iTXt') {
        const zero = data.indexOf(0);
        const compressed = data[zero + 1] === 1;
        const languageEnd = data.indexOf(0, zero + 3);
        const translatedEnd = data.indexOf(0, languageEnd + 1);
        const value = data.subarray(translatedEnd + 1);
        result.push(...textForms(compressed ? inflateSync(value) : value));
      }
      offset += length + 12;
    }
  }
  return result;
}

/** Decode font name records and the optional compressed metadata block. */
function fontMetadata(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'wOF2') return [];
  let offset = 48, streamOffset = 0, name = null;
  const uint128 = () => {
    let value = 0;
    for (let i = 0; i < 5; i++) {
      const b = bytes[offset++];
      value = value * 128 + (b & 0x7f);
      if (!(b & 0x80)) return value;
    }
    throw new Error('Invalid font directory');
  };
  for (let i = 0; i < bytes.readUInt16BE(12); i++) {
    const flags = bytes[offset++], tagIndex = flags & 63, version = flags >> 6;
    const tag = tagIndex === 63 ? bytes.toString('ascii', offset, offset += 4) : null;
    const originalLength = uint128();
    const transformed = (tagIndex === 10 || tagIndex === 11 || tag === 'glyf' || tag === 'loca') ? version === 0 : version !== 0;
    const length = transformed ? uint128() : originalLength;
    if (tagIndex === 5 || tag === 'name') name = { offset: streamOffset, length };
    streamOffset += length;
  }
  const result = [];
  if (name) {
    const stream = brotliDecompressSync(bytes.subarray(offset, offset + bytes.readUInt32BE(20)));
    const table = stream.subarray(name.offset, name.offset + name.length);
    const strings = table.readUInt16BE(4);
    for (let i = 0; i < table.readUInt16BE(2); i++) {
      const record = 6 + i * 12;
      const length = table.readUInt16BE(record + 8), start = strings + table.readUInt16BE(record + 10);
      result.push(...textForms(table.subarray(start, start + length)));
    }
  }
  const metadataOffset = bytes.readUInt32BE(28), metadataLength = bytes.readUInt32BE(32);
  if (metadataOffset && metadataLength) result.push(...textForms(brotliDecompressSync(bytes.subarray(metadataOffset, metadataOffset + metadataLength))));
  return result;
}

export function inspectContent(bytes, extension = '.txt', options = {}) {
  const isText = textExtensions.has(extension) || extension === '';
  const metadata = isText ? [bytes.toString('utf8')] : [...imageMetadata(bytes, extension), ...fontMetadata(bytes)];
  const issues = [];
  if (metadata.some((text) => wordPattern.test(text))) issues.push('restricted attribution');
  if (metadata.some((text) => containsPrivateText(text, options.privateTerms))) issues.push('private text');
  if (metadata.some((text) => dashPattern.test(text))) issues.push('nonstandard punctuation');
  // Inspect every binary file for longer readable tokens too, outside known metadata containers.
  if (!isText && textForms(bytes).some((text) => longPattern.test(text) || containsPrivateText(text, options.privateTerms))) issues.push('restricted binary text');
  return [...new Set(issues)];
}

export function inspectRepository(root, options = {}) {
  const issues = [];
  const walk = (folder) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (excludedDirs.has(entry.name) || entry.name === '.DS_Store') continue;
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) {
        for (const issue of inspectContent(fs.readFileSync(file), path.extname(file).toLowerCase(), options)) issues.push({ file: path.relative(root, file), issue });
      }
    }
  };
  walk(root);
  return issues;
}
