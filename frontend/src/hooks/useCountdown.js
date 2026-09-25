import { useEffect, useRef, useState } from "react";

/**
 * Drives CountdownRing. Recalculates the total whenever peopleAhead changes
 * (i.e. whenever the backend recalculates estimatedWaitTime — see section 16
 * of the backend spec) and ticks the remaining time down every second in
 * between updates so the ring never looks static.
 */
export default function useCountdown(peopleAhead, estimatedServiceMinutes = 5) {
  const secondsPerPerson = Math.max(estimatedServiceMinutes, 0) * 60;
  const totalRef = useRef(peopleAhead * secondsPerPerson);
  const [remainingSeconds, setRemainingSeconds] = useState(totalRef.current);

  useEffect(() => {
    const total = peopleAhead * secondsPerPerson;
    totalRef.current = total;
    setRemainingSeconds(total);
  }, [peopleAhead, secondsPerPerson]);

  useEffect(() => {
    const id = setInterval(() => {
      setRemainingSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return { remainingSeconds, totalSeconds: totalRef.current };
}
