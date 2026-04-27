import type { ReactNode } from 'react';

type Rule = { title: string; body: ReactNode };

const x01: Rule = {
  title: 'X01',
  body: (
    <>
      <p>
        Start at <strong>301</strong>, <strong>501</strong>, or <strong>701</strong>. First player to land
        exactly on zero wins the leg.
      </p>
      <p className="mt-2">
        Each turn is up to <strong>3 darts</strong>. The score of every dart is subtracted from your remaining total.
      </p>
      <p className="mt-2">
        <strong>In rule:</strong>
      </p>
      <ul className="mt-1 list-inside list-disc">
        <li><strong>Straight in</strong> — any dart starts you.</li>
        <li><strong>Double in</strong> — your first scoring dart must land in a double (or bull).</li>
      </ul>
      <p className="mt-2">
        <strong>Out rule:</strong>
      </p>
      <ul className="mt-1 list-inside list-disc">
        <li><strong>Straight out</strong> — finish on any segment that takes you to zero.</li>
        <li><strong>Double out</strong> — the dart that takes you to zero must be a double (or bull).</li>
        <li><strong>Masters out</strong> — the finishing dart must be a double or a triple.</li>
      </ul>
      <p className="mt-2">
        <strong>Bust:</strong> if a dart would take you below zero, or to one when double-out is on, the
        turn is voided and your score reverts to the start of the turn.
      </p>
      <p className="mt-2">
        A match is a best-of-<em>legs to win</em>. Players alternate who throws first each leg.
      </p>
    </>
  )
};

const x01vc: Rule = {
  title: 'X01 vs Computer',
  body: (
    <>
      <p>Same rules as X01, played against a computer opponent.</p>
      <p className="mt-2">
        <strong>Difficulty</strong> is a 1–10 scale: 1 is a beginner, 10 is expert. Higher difficulty
        means tighter grouping and better checkouts.
      </p>
      <p className="mt-2">
        <strong>Who goes first:</strong>
      </p>
      <ul className="mt-1 list-inside list-disc">
        <li><strong>You</strong> — you start every leg.</li>
        <li><strong>Computer</strong> — the computer starts every leg.</li>
        <li><strong>Alternate</strong> — you start leg 1, then it alternates.</li>
        <li><strong>Random</strong> — coin flip at the start of the match.</li>
      </ul>
      <p className="mt-2">
        Use Undo to revert your last dart. The computer plays automatically on its turn.
      </p>
    </>
  )
};

const cricket: Rule = {
  title: 'Cricket',
  body: (
    <>
      <p>
        The active numbers are <strong>15, 16, 17, 18, 19, 20</strong> and the <strong>Bull</strong>.
        The goal is to close every number and have at least as many points as your opponents.
      </p>
      <p className="mt-2">
        Each turn is <strong>3 darts</strong>. Hits add marks to a number — singles count 1 mark, doubles
        2, triples 3. A number is <strong>open</strong> for you once you have 3 marks on it.
      </p>
      <p className="mt-2">
        While a number is open for you and not yet closed by all opponents, extra hits on it score
        points equal to the number times the multiplier. The number is <strong>closed</strong> once every
        player has 3 marks on it — after that, no one can score on it.
      </p>
      <p className="mt-2">
        <strong>Win condition:</strong> close all seven targets and be tied for, or ahead in, points.
      </p>
      <p className="mt-2">
        A match is a best-of-<em>legs to win</em>.
      </p>
    </>
  )
};

const rtw: Rule = {
  title: 'Round the World',
  body: (
    <>
      <p>
        Work through a sequence of targets in order. Hit the current target to advance to the next.
      </p>
      <p className="mt-2">
        <strong>Game type</strong> sets what counts as a hit on the target:
      </p>
      <ul className="mt-1 list-inside list-disc">
        <li><strong>Single</strong> — any single, double, or triple of the number.</li>
        <li><strong>Single Inner</strong> / <strong>Single Outer</strong> — only the inner or outer single ring.</li>
        <li><strong>Double</strong> — only the double ring of the number.</li>
        <li><strong>Triple</strong> — only the triple ring of the number (Bull is excluded).</li>
      </ul>
      <p className="mt-2">
        <strong>Mode</strong> controls how darts and advancement work:
      </p>
      <ul className="mt-1 list-inside list-disc">
        <li><strong>Hit once</strong> — keep throwing the same target until you hit it.</li>
        <li><strong>3 darts per target</strong> — three darts per target, then advance regardless.</li>
        <li><strong>1-dart per target</strong> — one dart per target, then advance.</li>
        <li><strong>3-darts until hit 1 / 2 / 3</strong> — three darts per target; you must score the required number of hits to count it as cleared.</li>
      </ul>
      <p className="mt-2">
        <strong>Order:</strong> 1–20, 20–1, Clockwise, Counter Clockwise, or Random. You can also
        exclude the Bull from the sequence (Bull is automatically excluded for Triple type).
      </p>
    </>
  )
};

const rtwScoring: Rule = {
  title: 'RTW Scoring',
  body: (
    <>
      <p>
        Round the World played for points across all <strong>21 targets</strong> (1–20 plus the Bull).
      </p>
      <p className="mt-2">
        Each target gets exactly <strong>3 darts</strong>. Each dart scores by quality:
      </p>
      <ul className="mt-1 list-inside list-disc">
        <li><strong>Miss</strong> — 0 points</li>
        <li><strong>Single</strong> — 1 point</li>
        <li><strong>Double</strong> — 2 points</li>
        <li><strong>Triple</strong> — 3 points (Bull: outer = 1, inner = 2)</li>
      </ul>
      <p className="mt-2">
        After 3 darts you advance to the next target. The session ends after all 21 targets; your
        total score is the sum across them.
      </p>
      <p className="mt-2">
        <strong>Order:</strong> 1–20, 20–1, Clockwise, Counter Clockwise, or Random.
      </p>
    </>
  )
};

const checkout: Rule = {
  title: 'Checkout Practice',
  body: (
    <>
      <p>
        Practice finishing combinations from a fixed finish total. Pick the finishes you want to drill
        and how many attempts to give each one.
      </p>
      <p className="mt-2">
        Each <strong>attempt</strong> is up to <strong>3 darts</strong> to take the score to zero. Hitting
        zero counts as a successful checkout; otherwise the attempt is recorded as missed.
      </p>
      <p className="mt-2">
        <strong>Out rule:</strong>
      </p>
      <ul className="mt-1 list-inside list-disc">
        <li><strong>Double out</strong> — the finishing dart must be a double or bull.</li>
        <li><strong>Masters out</strong> — the finishing dart must be a double or triple.</li>
      </ul>
      <p className="mt-2">
        <strong>Mode:</strong>
      </p>
      <ul className="mt-1 list-inside list-disc">
        <li><strong>Targeted</strong> — finishes are played in the order you selected.</li>
        <li><strong>Random</strong> — finishes are shuffled at the start of the session.</li>
      </ul>
      <p className="mt-2">
        Hit rate, total checkouts, and total attempts are tracked live.
      </p>
    </>
  )
};

export const RULES: Record<string, Rule> = {
  x01,
  x01vc,
  cricket,
  rtw,
  'rtw-scoring': rtwScoring,
  checkout
};
