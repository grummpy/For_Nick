/**
 * Local FERPA screen for prompts.
 * Detects student identifiers and returns categories only — never the matched text.
 * Nothing here is written to disk or forwarded.
 */

const REASON = 'This prompt was blocked so student information is not sent to the assistant. FERPA protects education records, including identifiers that can be tied to a student. Nothing was submitted. Remove the items below, then send the prompt again.';

const STUDENT_ID_WHY = 'A student ID is protected student information and cannot be sent.';

const DETECTORS = [
  {
    source: String.raw`\b\d{3}[-.\s]\d{2}[-.\s]\d{4}\b`,
    flags: 'g',
    type: 'ssn',
    label: 'Social Security number',
    why: 'A Social Security number is a student identifier and cannot be sent.'
  },
  {
    source: String.raw`\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b`,
    flags: 'gi',
    type: 'email',
    label: 'Email address',
    why: 'An email address can identify a student and cannot be sent.'
  },
  {
    source: String.raw`(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\b\d{3})[\s.-]\d{3}[\s.-]\d{4}\b`,
    flags: 'g',
    type: 'phone',
    label: 'Phone number',
    why: 'Phone numbers can identify a student, so they cannot be sent.'
  },
  {
    source: String.raw`\b(?:telephone|phone|mobile|cell|tel)\s*(?:number|no\.?|#)?\s*[#:\-]?\s*\+?\d[\d().\-\s]{8,16}\d\b`,
    flags: 'gi',
    type: 'phone',
    label: 'Phone number',
    why: 'Phone numbers can identify a student, so they cannot be sent.'
  },
  {
    source: String.raw`\b1\d{10}\b`,
    flags: 'g',
    type: 'phone',
    label: 'Phone number',
    why: 'Phone numbers can identify a student, so they cannot be sent.'
  },
  {
    source: String.raw`\b\d{3}[-.\s]\d{4}\b`,
    flags: 'g',
    type: 'phone',
    label: 'Phone number',
    why: 'Phone numbers can identify a student, so they cannot be sent.'
  },
  {
    source: String.raw`\+\d{1,3}(?:[\s.-]?\d){8,14}\b`,
    flags: 'g',
    type: 'phone',
    label: 'Phone number',
    why: 'Phone numbers can identify a student, so they cannot be sent.'
  },
  {
    source: String.raw`\b(?:d\.?\s*o\.?\s*b\.?|date of birth|birth date|born on)\s*[#:=\-]?\s*(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b`,
    flags: 'gi',
    type: 'dob',
    label: 'Date of birth',
    why: 'A date of birth can identify a student and cannot be sent.'
  },
  {
    source: String.raw`\bP\.?\s*O\.?\s*Box\s+\d{1,6}\b`,
    flags: 'gi',
    type: 'address',
    label: 'Street address',
    why: 'A street address can identify a student and cannot be sent.'
  },
  {
    source: String.raw`\b\d{1,6}\s+(?:[A-Za-z0-9.'-]+\s+){1,5}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Ter|Circle|Cir)\.?\b`,
    flags: 'gi',
    type: 'address',
    label: 'Street address',
    why: 'A street address can identify a student and cannot be sent.'
  },
  {
    source: String.raw`\b(?:student|Student|STUDENT)(?:'s|'S)?\s+(?:name|Name|NAME)\s*(?:is|Is|IS|:|-)\s*(?:[A-Z][a-z'’.-]+|[A-Z]{2,})(?:\s+(?:[A-Z][a-z'’.-]+|[A-Z]{2,})){0,3}\b`,
    flags: 'g',
    type: 'student_name',
    label: 'Student name',
    why: 'Refer to the student as “a student” instead of using their name.'
  },
  {
    source: String.raw`\b(?:student(?:'s)?\s*(?:id(?:\s*number)?|identification(?:\s*number)?|number|#|no\.?)|banner\s*id|campus\s*id|college\s*id|university\s*id|school\s*id|emplid|employee\s*id|peoplesoft\s*id|cwid|uin|sid)\s*[#:\-]?\s*#?\s*[A-Za-z]?\d{5,12}\b`,
    flags: 'gi',
    type: 'student_id',
    label: 'Student ID',
    why: STUDENT_ID_WHY
  },
  {
    source: String.raw`\bid\s*[#:\-]?\s*#?\s*[A-Za-z]?\d{5,12}\b`,
    flags: 'gi',
    type: 'student_id',
    label: 'Student ID',
    why: STUDENT_ID_WHY
  },
  {
    source: String.raw`\b[A-Za-z]\d{6,10}\b`,
    flags: 'g',
    type: 'student_id',
    label: 'Student ID',
    why: STUDENT_ID_WHY
  },
  {
    source: String.raw`(?<![\d.])\d{7,10}(?!\d)(?!\.\d)`,
    flags: 'g',
    build(match) {
      const length = match[0].length;
      if (length === 9) {
        return {
          type: 'student_id',
          label: 'Student ID or Social Security number',
          why: 'A 9-digit number can be a Social Security number or a student ID, so it cannot be sent.'
        };
      }
      if (length === 10) {
        return {
          type: 'phone',
          label: 'Phone number or student ID',
          why: 'A 10-digit number can be a phone number or a student ID, so it cannot be sent.'
        };
      }
      return {
        type: 'student_id',
        label: 'Student ID',
        why: STUDENT_ID_WHY
      };
    }
  }
];

function scan(text) {
  const spans = [];
  const hits = [];
  for (const detector of DETECTORS) {
    const flags = detector.flags.includes('g') ? detector.flags : `${detector.flags}g`;
    const regex = new RegExp(detector.source, flags);
    for (const match of text.matchAll(regex)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (spans.some(([from, to]) => start < to && end > from)) continue;
      spans.push([start, end]);
      const built = detector.build ? detector.build(match) : detector;
      hits.push({ type: built.type, label: built.label, why: built.why });
    }
  }
  return hits;
}

function phrase(label) {
  const normalized = label.replaceAll('Social Security', 'social security');
  return normalized.charAt(0).toLowerCase() + normalized.slice(1);
}

function describe(item) {
  const place = item.kind === 'file' ? 'in an attached file name' : 'in your prompt';
  const name = phrase(item.label);
  const target = item.count > 1 ? `${item.count} instances of ${name}` : `the ${name}`;
  return `Remove ${target} ${place}. ${item.why}`;
}

function merge(hits) {
  const grouped = new Map();
  for (const hit of hits) {
    const key = `${hit.kind}|${hit.type}|${hit.label}|${hit.why}`;
    const current = grouped.get(key);
    if (current) current.count += 1;
    else grouped.set(key, { ...hit, count: 1 });
  }
  return [...grouped.values()].map(item => ({
    type: item.type,
    label: item.label,
    count: item.count,
    detail: describe(item)
  }));
}

export function inspectSubmission({ query = '', files = [] } = {}) {
  const hits = scan(String(query ?? '')).map(hit => ({ ...hit, kind: 'prompt' }));
  const list = Array.isArray(files) ? files : [];
  for (const file of list) {
    const name = typeof file === 'string' ? file : file?.name;
    if (!name) continue;
    hits.push(...scan(String(name)).map(hit => ({ ...hit, kind: 'file' })));
  }
  const findings = merge(hits);
  return {
    blocked: findings.length > 0,
    title: 'Prompt blocked',
    reason: findings.length ? REASON : '',
    findings
  };
}
