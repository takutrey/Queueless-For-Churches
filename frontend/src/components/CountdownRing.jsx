import useCountdown from "../hooks/useCountdown";

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const SIZE = 168;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CountdownRing({ peopleAhead, estimatedServiceMinutes = 5 }) {
  const { remainingSeconds, totalSeconds } = useCountdown(
    peopleAhead,
    estimatedServiceMinutes,
  );

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const offset = CIRCUMFERENCE * (1 - progress);

  const label =
    peopleAhead <= 0
      ? "You're next"
      : totalSeconds === 0
        ? "Almost there"
        : "Estimated wait";

  return (
    <div className="ring-wrap">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle className="ring-track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />
        <circle
          className="ring-progress"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={peopleAhead <= 0 ? 0 : offset}
        />
      </svg>
      <div className="ring-center">
        <div className="ring-center__time tabular">
          {peopleAhead <= 0 ? "0:00" : formatClock(remainingSeconds)}
        </div>
        <div className="ring-center__label">{label}</div>
      </div>
    </div>
  );
}
