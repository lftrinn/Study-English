import type { AnswerCheckResult } from '@/types/practice';

export type CheckOptions = {
  ignoreCase?: boolean;
  ignorePunctuation?: boolean;
  /** When true, exact match (after normalization) required. */
  strict?: boolean;
};

const PUNCT_REGEX = /[.,/#!$%^&*;:{}=\-_`~()'"?‘’“”]/g;

function tokenize(s: string, opts: CheckOptions): string[] {
  let str = s;
  if (opts.ignoreCase !== false) str = str.toLowerCase();
  if (opts.ignorePunctuation !== false) str = str.replace(PUNCT_REGEX, '');
  return str
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Word-level diff that aligns expected vs user tokens for highlighting. */
function diff(expectedTokens: string[], userTokens: string[]): AnswerCheckResult['diff'] {
  const out: AnswerCheckResult['diff'] = [];
  const max = Math.max(expectedTokens.length, userTokens.length);
  for (let i = 0; i < max; i += 1) {
    const exp = expectedTokens[i];
    const usr = userTokens[i];
    if (exp === undefined && usr !== undefined) {
      out.push({ token: usr, status: 'wrong' });
    } else if (usr === undefined && exp !== undefined) {
      out.push({ token: exp, status: 'missing' });
    } else if (exp === usr) {
      out.push({ token: exp ?? '', status: 'match' });
    } else {
      out.push({ token: usr ?? exp ?? '', status: 'wrong' });
    }
  }
  return out;
}

function score(expected: string[], user: string[]): number {
  if (expected.length === 0 && user.length === 0) return 1;
  if (expected.length === 0 || user.length === 0) return 0;
  let matches = 0;
  const max = Math.max(expected.length, user.length);
  for (let i = 0; i < max; i += 1) {
    if (expected[i] && user[i] && expected[i] === user[i]) matches += 1;
  }
  return matches / max;
}

function check(
  expected: string,
  userAnswer: string,
  options: CheckOptions = {},
): AnswerCheckResult {
  const opts: CheckOptions = {
    ignoreCase: options.ignoreCase ?? true,
    ignorePunctuation: options.ignorePunctuation ?? true,
    strict: options.strict ?? false,
  };
  const exp = tokenize(expected, opts);
  const usr = tokenize(userAnswer, opts);
  const tokenScore = score(exp, usr);
  const isCorrect = opts.strict
    ? exp.join(' ') === usr.join(' ')
    : tokenScore >= 0.85 && Math.abs(exp.length - usr.length) <= 1;

  return {
    isCorrect,
    score: tokenScore,
    expectedTokens: exp,
    userTokens: usr,
    diff: diff(exp, usr),
  };
}

function firstLetterHint(expected: string): string {
  return expected
    .split(/\s+/)
    .map((t) => (t.length > 0 ? `${t[0]}${'_'.repeat(Math.max(0, t.length - 1))}` : ''))
    .join(' ');
}

export const answerCheckService = {
  check,
  tokenize,
  diff,
  firstLetterHint,
};
