import { Button } from '@mantine/core';
import { type SessionRecord, getScore } from './history.ts';
import { useEffect, useRef } from 'react';

const TITLES: Record<SessionRecord['mode'], string> = {
  clock: 'Time’s up',
  endless: 'Stopped',
  round: 'Round done',
};

export default function SummaryScreen({
  onPlayAgain,
  onStartScreen,
  previousBest,
  record,
}: {
  onPlayAgain: () => void;
  onStartScreen: () => void;
  previousBest: number | null; // best before this session, same settings
  record: SessionRecord;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const accuracy =
    record.total > 0 ? Math.round((record.correct / record.total) * 100) : 0;
  const score = getScore(record);
  const isNewBest =
    score > 0 && (previousBest === null || score > previousBest);
  const best = Math.max(score, previousBest ?? 0);

  const rows: [string, string][] = [];
  if (record.mode === 'round') {
    rows.push(['Right', `${record.correct} of ${record.total}`]);
  } else {
    rows.push(['Right', String(record.correct)]);
    rows.push(['Wrong', String(record.total - record.correct)]);
  }
  rows.push(['Accuracy', `${accuracy}%`]);
  rows.push([
    'Average time (right answers)',
    record.averageMs === null ? 'None right' : `${record.averageMs} ms`,
  ]);
  if (record.mode === 'endless') {
    rows.push(['Longest run', `${record.longestRun} in a row`]);
  }

  let bestText;
  if (record.mode === 'round') {
    bestText = `${best} of ${record.roundLength}`;
  } else if (record.mode === 'clock') {
    bestText = `${best} right`;
  } else {
    bestText = `${best} in a row`;
  }

  return (
    <main className='screen summary'>
      <h1 className='title' ref={headingRef} tabIndex={-1}>
        {TITLES[record.mode]}
      </h1>
      <dl className='results'>
        {rows.map(([label, value]) => (
          <div className='result-row' key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        <div className='result-row'>
          <dt>Best for these settings</dt>
          <dd>
            {bestText}
            {isNewBest && <strong className='new-best'> New best</strong>}
          </dd>
        </div>
      </dl>
      <div className='fields'>
        <Button
          className='start-button'
          fullWidth
          onClick={onPlayAgain}
          size='xl'
        >
          Play again
        </Button>
        <Button fullWidth onClick={onStartScreen} variant='default'>
          Start screen
        </Button>
      </div>
    </main>
  );
}
