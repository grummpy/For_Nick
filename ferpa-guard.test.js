import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectSubmission } from './ferpa-guard.js';

const phone = '415-555-0199';
const studentId = '10293847';

function labels(query, files) {
  return inspectSubmission({ query, files }).findings.map(finding => finding.label);
}

test('allows ordinary class questions', () => {
  const samples = [
    'How do I explain the water cycle to an earth science class?',
    'CS 101 has 30 students and meets in room 214.',
    'In 2024 the college added a writing seminar.',
    'What is FERPA, in plain language?',
    'Help me grade short essays without naming anyone.',
    'The approximation starts at 3.14159265.',
    'A student name is required on the printed roster header.',
    'Born in 2004 is not a full date of birth.'
  ];
  for (const query of samples) {
    const result = inspectSubmission({ query });
    assert.equal(result.blocked, false, query);
    assert.deepEqual(result.findings, []);
  }
});

test('blocks phone numbers in common formats', () => {
  for (const value of ['(415) 555-0199', '415-555-0199', '415.555.0199', '+1 415 555 0199', '1-415-555-0199', '555-0199']) {
    const result = inspectSubmission({ query: `Please call ${value} about office hours.` });
    assert.equal(result.blocked, true, value);
    assert.equal(result.title, 'Prompt blocked');
    assert.equal(result.findings.length, 1, value);
    assert.equal(result.findings[0].label, 'Phone number');
    assert.match(result.findings[0].detail, /Remove the phone number in your prompt/);
    assert.equal(JSON.stringify(result).includes('0199'), false);
    assert.equal(JSON.stringify(result).includes('415'), false);
  }
});

test('blocks unlabeled identifiers by shape', () => {
  assert.deepEqual(labels(`The record is ${studentId}.`), ['Student ID']);
  assert.deepEqual(labels('Look up 123456789 before class.'), ['Student ID or Social Security number']);
  assert.deepEqual(labels('Call 4155550199 tomorrow.'), ['Phone number or student ID']);
});

test('blocks Social Security numbers, email, dates of birth, and addresses', () => {
  assert.deepEqual(labels('SSN 123-45-6789 is on the form.'), ['Social Security number']);
  assert.deepEqual(labels('Write to ada@college.edu about the lab.'), ['Email address']);
  assert.deepEqual(labels('DOB 04/11/2004 should not be included.'), ['Date of birth']);
  assert.deepEqual(labels('The student lives at 42 Oak Street.'), ['Street address']);
  assert.deepEqual(labels('Mail it to P.O. Box 18.'), ['Street address']);
});

test('blocks labeled student ids and names once', () => {
  const idResult = inspectSubmission({ query: `Look up student id ${studentId} for tutoring.` });
  assert.equal(idResult.findings.length, 1);
  assert.equal(idResult.findings[0].label, 'Student ID');
  assert.equal(idResult.findings[0].count, 1);
  assert.match(idResult.findings[0].detail, /Remove the student ID in your prompt/);

  assert.deepEqual(labels('Banner ID: B00123456'), ['Student ID']);
  assert.deepEqual(labels('Student name: Jordan Lee needs a topic.'), ['Student name']);
  assert.equal(JSON.stringify(inspectSubmission({ query: 'Student name: Jordan Lee' })).includes('Jordan'), false);
});

test('counts repeated phone numbers and keeps file names separate', () => {
  const repeated = inspectSubmission({ query: 'Call (415) 555-0199 or 212-555-0176.' });
  assert.equal(repeated.findings.length, 1);
  assert.equal(repeated.findings[0].count, 2);
  assert.match(repeated.findings[0].detail, /2 instances of phone number/);

  const named = inspectSubmission({
    query: 'Summarize the attached roster.',
    files: [{ name: `grades-${studentId}.pdf`, size: 1200 }]
  });
  assert.equal(named.blocked, true);
  assert.equal(named.findings.length, 1);
  assert.match(named.findings[0].detail, /attached file name/);
  assert.equal(JSON.stringify(named).includes(studentId), false);
});

test('does not treat a formatted phone number as an extra student id', () => {
  const result = inspectSubmission({ query: `Reach them at ${phone}.` });
  assert.deepEqual(result.findings.map(finding => finding.type), ['phone']);
});

test('server blocks the prompt and does not echo it', async () => {
  process.env.PORT = '3977';
  const { startServer, stopServer } = await import('./server.js');
  await startServer();
  try {
    const blocked = await fetch('http://127.0.0.1:3977/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `Please call the student at ${phone} about id ${studentId}.` })
    });
    const blockedBody = await blocked.json();
    assert.equal(blocked.status, 422);
    assert.equal(blockedBody.blocked, true);
    assert.equal(blockedBody.title, 'Prompt blocked');
    assert.ok(blockedBody.findings.length >= 2);
    const encoded = JSON.stringify(blockedBody);
    assert.equal(encoded.includes('415'), false);
    assert.equal(encoded.includes('0199'), false);
    assert.equal(encoded.includes(studentId), false);

    const allowed = await fetch('http://127.0.0.1:3977/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'How do clouds form?' })
    });
    const allowedBody = await allowed.json();
    assert.equal(allowed.status, 200);
    assert.equal(allowedBody.blocked, undefined);
    assert.match(allowedBody.answer, /How do clouds form/);
  } finally {
    await stopServer();
  }
});
