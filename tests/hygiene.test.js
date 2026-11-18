import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, brotliCompressSync } from 'node:zlib';
import { inspectContent, RESTRICTED_WORDS } from './repository-hygiene.mjs';

function jpegSegment(payload) {
  const size = Buffer.alloc(2);
  size.writeUInt16BE(payload.length + 2);
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe1]), size, payload, Buffer.from([0xff, 0xd9])]);
}

test('Hygiene 01: encoded scanner vocabulary is checked against seeded source text', () => {
  for (const word of RESTRICTED_WORDS) {
    assert.ok(inspectContent(Buffer.from('Fixture ' + word + ' content.')).includes('restricted attribution'));
  }
  for (const text of [
    'Ordinary patient instructions.',
    'One adult assigned to call 911 and read the exact street address.',
    'Oct 10 4 PM - Oct 11 4 PM CT',
    '390 px very long place, no sideways scroll at 390 px'
  ]) {
    assert.deepEqual(inspectContent(Buffer.from(text)), []);
  }
});

test('Hygiene 02: compressed image text and short tokens in image metadata are detected', () => {
  const text = RESTRICTED_WORDS[0] + String.fromCharCode(0x2013);
  const jpg = jpegSegment(Buffer.from(text));
  assert.ok(inspectContent(jpg, '.jpg').includes('restricted attribution'));
  assert.ok(inspectContent(jpg, '.jpg').includes('nonstandard punctuation'));
  const payload = Buffer.concat([Buffer.from('Description\0\0'), deflateSync(Buffer.from(text))]);
  const size = Buffer.alloc(4); size.writeUInt32BE(payload.length);
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), size, Buffer.from('zTXt'), payload, Buffer.alloc(4)]);
  assert.ok(inspectContent(png, '.png').includes('restricted attribution'));
  assert.ok(inspectContent(png, '.png').includes('nonstandard punctuation'));
});

test('Hygiene 03: compressed font name records are inspected', () => {
  const value = Buffer.from(RESTRICTED_WORDS[3], 'utf16le').swap16();
  const table = Buffer.alloc(18);
  table.writeUInt16BE(1, 2); table.writeUInt16BE(18, 4);
  table.writeUInt16BE(3, 6); table.writeUInt16BE(1, 8);
  table.writeUInt16BE(1, 12); table.writeUInt16BE(value.length, 14);
  const names = Buffer.concat([table, value]);
  const compressed = brotliCompressSync(names);
  const header = Buffer.alloc(48);
  header.write('wOF2'); header.writeUInt16BE(1, 12); header.writeUInt32BE(compressed.length, 20);
  const font = Buffer.concat([header, Buffer.from([5, names.length]), compressed]);
  assert.ok(inspectContent(font, '.woff2').includes('restricted attribution'));
});

function encodedProbes(value) {
  const points = Array.from(value, (character) => character.codePointAt(0));
  return [
    '[' + points.join(',') + ']',
    '[' + points.map((point) => '0x' + point.toString(16)).join(',') + ']',
    'String.fromCharCode(' + points.join(',') + ')',
    Buffer.from(value).toString('hex'),
    Buffer.from(value).toString('base64'),
    points.map((point) => '\\u' + point.toString(16).padStart(4, '0')).join(''),
    points.map((point) => '%' + point.toString(16).padStart(2, '0')).join(''),
    points.map((point) => '&#' + point + ';').join('')
  ];
}

test('Hygiene 04: synthetic contact and personal-field probes are detected in both metadata encodings', () => {
  const values = [
    ['fixture.user', 'example.invalid'].join('@'),
    [42, 'Example', 'Road'].join(' '),
    [42, 'EXAMPLE', 'ROAD'].join(' '),
    ['Patient', 'name'].join(' ') + ': Sample Person',
    '/' + ['Users', 'fixture-account', 'notes.txt'].join('/')
  ];
  for (const value of values) {
    assert.ok(inspectContent(Buffer.from(value)).includes('private text'));
    const little = Buffer.from(value, 'utf16le');
    assert.ok(inspectContent(jpegSegment(little), '.jpg').includes('private text'));
    assert.ok(inspectContent(jpegSegment(Buffer.from(little).swap16()), '.jpg').includes('private text'));
  }
});

test('Hygiene 05: common encodings cannot hide synthetic contact details', () => {
  const email = ['fixture.user', 'example.invalid'].join('@');
  for (const encoded of encodedProbes(email)) {
    assert.ok(inspectContent(Buffer.from(encoded), '.js').includes('private text'));
  }
});

test('Hygiene 06: an optional external denylist detects synthetic names without shipping personal values', () => {
  const value = 'Example Fixture Person';
  const options = { privateTerms: [value, '', null, 42] };
  assert.deepEqual(inspectContent(Buffer.from(value)), []);
  for (const encoded of [value, ...encodedProbes(value)]) {
    assert.ok(inspectContent(Buffer.from(encoded), '.js', options).includes('private text'));
  }
  const little = Buffer.from(value, 'utf16le');
  assert.ok(inspectContent(jpegSegment(little), '.jpg', options).includes('private text'));
  assert.ok(inspectContent(jpegSegment(Buffer.from(little).swap16()), '.jpg', options).includes('private text'));
  assert.deepEqual(inspectContent(Buffer.from(value)), [], 'the external denylist must not persist between scans');
});

test('Hygiene 07: compressed image metadata cannot hide synthetic contact details', () => {
  const value = ['fixture.user', 'example.invalid'].join('@');
  const payload = Buffer.concat([Buffer.from('Description\0\0'), deflateSync(Buffer.from(value))]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(payload.length);
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), size, Buffer.from('zTXt'), payload, Buffer.alloc(4)]);
  assert.ok(inspectContent(png, '.png').includes('private text'));
});
