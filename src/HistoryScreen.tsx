import { getSettingsText } from './settingsText.ts';
import { Button, SegmentedControl } from '@mantine/core';
import HistoryChart, { type ChartPoint } from './HistoryChart.tsx';
import { MODES, type Mode } from './settings.ts';
import { type SessionRecord, clearHistory } from './history.ts';
import { useEffect, useRef, useState } from 'react';

const MODE_LABELS: Record<Mode, string> = {
  clock: 'Clock',
  endless: 'Endless',
  round: 'Round',
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function getAccuracy(record: SessionRecord): number {
  return record.total > 0
    ? Math.round((record.correct / record.total) * 100)
    : 0;
}

function getResultText(record: SessionRecord): string {
  const accuracy = `${getAccuracy(record)}%`;
  if (record.mode === 'round') {
    return `${record.correct} of ${record.total}, ${accuracy}`;
  } else if (record.mode === 'clock') {
    return `${record.correct} right, ${accuracy}`;
  } else {
    return `${record.correct} of ${record.total}, ${accuracy}, run of ${record.longestRun}`;
  }
}

export default function HistoryScreen({
  history,
  onBack,
  onCleared,
}: {
  history: SessionRecord[];
  onBack: () => void;
  onCleared: () => void;
}) {
  const [mode, setMode] = useState<Mode>('round');
  const [confirming, setConfirming] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const sessions = history.filter((record) => record.mode === mode);
  function getPoints(getValue: (record: SessionRecord) => number | null) {
    return sessions.map((record, index): ChartPoint => ({
      number: index + 1,
      record,
      value: getValue(record),
    }));
  }

  let charts;
  if (mode === 'clock') {
    charts = (
      <HistoryChart
        points={getPoints((record) => record.correct)}
        title='Number right'
        unit=' right'
      />
    );
  } else {
    charts = (
      <>
        <HistoryChart
          points={getPoints(getAccuracy)}
          title='Accuracy (%)'
          unit='%'
        />
        <HistoryChart
          points={getPoints((record) => record.averageMs)}
          title='Average time on right answers (ms)'
          unit=' ms'
        />
        {mode === 'endless' && (
          <HistoryChart
            points={getPoints((record) => record.longestRun)}
            title='Longest run'
            unit=' in a row'
          />
        )}
      </>
    );
  }

  function handleClear() {
    clearHistory();
    setConfirming(false);
    onCleared();
  }

  return (
    <main className='screen history'>
      <h1 className='title' ref={headingRef} tabIndex={-1}>
        History
      </h1>
      <p className='field-help'>Kept on this phone only.</p>

      <fieldset className='field'>
        <legend className='field-label'>Mode</legend>
        <SegmentedControl
          data={MODES.map((value) => ({ label: MODE_LABELS[value], value }))}
          fullWidth
          name='history-mode'
          onChange={(value) => {
            const picked = MODES.find((item) => item === value);
            if (picked) {
              setMode(picked);
            }
          }}
          value={mode}
        />
      </fieldset>

      {sessions.length === 0 ? (
        <p>No {MODE_LABELS[mode].toLowerCase()} sessions yet.</p>
      ) : (
        <>
          {charts}
          <h2 className='section-heading'>Sessions</h2>
          <div className='table-wrap'>
            <table className='sessions'>
              <thead>
                <tr>
                  <th scope='col'>Date</th>
                  <th scope='col'>Settings</th>
                  <th scope='col'>Result</th>
                </tr>
              </thead>
              <tbody>
                {sessions.toReversed().map((record) => (
                  <tr key={record.date}>
                    <td>{DATE_FORMAT.format(record.date)}</td>
                    <td>{getSettingsText(record)}</td>
                    <td>{getResultText(record)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className='fields'>
        {history.length > 0 && !confirming && (
          <Button onClick={() => setConfirming(true)} variant='default'>
            Clear history
          </Button>
        )}
        {confirming && (
          <div className='confirm'>
            <p>
              Clear all {history.length} sessions and best scores? This can’t be
              undone.
            </p>
            <div className='nav-buttons'>
              <Button color='red' onClick={handleClear}>
                Clear
              </Button>
              <Button onClick={() => setConfirming(false)} variant='default'>
                Cancel
              </Button>
            </div>
          </div>
        )}
        <Button onClick={onBack} variant='default'>
          Start screen
        </Button>
      </div>
    </main>
  );
}
