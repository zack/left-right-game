import type { SessionRecord } from './history.ts';
import { getSettingsText } from './settingsText.ts';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

export interface ChartPoint {
  number: number; // 1 for the oldest session shown
  record: SessionRecord;
  value: number | null;
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

// Recharts fills in active and label when it draws the tooltip. The label
// is the session number on the x axis, which finds the point without
// trusting the untyped payload.
function ChartTooltip({
  active,
  label,
  points,
  unit,
}: Partial<TooltipContentProps> & { points: ChartPoint[]; unit: string }) {
  const point = points.find((item) => item.number === label);
  if (!active || !point || point.value === null) {
    return null;
  }
  return (
    <div className='chart-tooltip'>
      <div className='chart-tooltip-value'>
        {point.value}
        {unit}
      </div>
      <div>{DATE_FORMAT.format(point.record.date)}</div>
      <div>{getSettingsText(point.record)}</div>
    </div>
  );
}

// One measure per chart. Accuracy, milliseconds and counts don't share a
// scale, so they each get their own small chart rather than a second axis.
export default function HistoryChart({
  points,
  title,
  unit,
}: {
  points: ChartPoint[];
  title: string;
  unit: string;
}) {
  return (
    <figure className='chart'>
      <figcaption className='chart-title'>{title}</figcaption>
      <ResponsiveContainer height={160} width='100%'>
        <LineChart
          data={points}
          margin={{ bottom: 0, left: 0, right: 12, top: 8 }}
        >
          <CartesianGrid stroke='var(--grid)' vertical={false} />
          <XAxis
            dataKey='number'
            stroke='var(--muted)'
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            stroke='var(--muted)'
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            tickLine={false}
            width={44}
          />
          <Tooltip
            content={<ChartTooltip points={points} unit={unit} />}
            cursor={{ stroke: 'var(--muted)' }}
          />
          <Line
            activeDot={{ r: 6 }}
            connectNulls
            dataKey='value'
            dot={{ fill: 'var(--accent)', r: 4, strokeWidth: 0 }}
            isAnimationActive={false}
            stroke='var(--accent)'
            strokeWidth={2}
            type='linear'
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
