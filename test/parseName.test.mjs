import assert from 'node:assert/strict'
import { test } from 'node:test'
import ical2json from 'ical2json'
import { parseName } from '../lib/meetup/helpers/parseName.ts'

test('decodes the iCalendar TEXT escapes in event titles', () => {
  assert.equal(parseName(String.raw`C\\Users workshop`), String.raw`C\Users workshop`)
  assert.equal(parseName(String.raw`One\nTwo`), 'One\nTwo')
  assert.equal(parseName(String.raw`One\NTwo`), 'One\nTwo')
  assert.equal(parseName(String.raw`C\, C++\; then C#`), 'C, C++; then C#')
})

test('preserves ordinary backslashes and title text', () => {
  assert.equal(parseName(String.raw`C:\Users`), String.raw`C:\Users`)
  assert.equal(parseName('Node.js and C#'), 'Node.js and C#')
})

test('decodes a SUMMARY after the installed iCalendar converter', () => {
  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'UID:sample',
    'DTSTART:20261117T230000Z',
    String.raw`SUMMARY:C:\\Users workshop\, then Node.js`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')

  const summary = ical2json.convert(ical).VCALENDAR[0].VEVENT[0].SUMMARY
  assert.equal(parseName(summary), String.raw`C:\Users workshop, then Node.js`)
})
