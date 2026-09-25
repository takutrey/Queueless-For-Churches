import { Users, Clock, Timer } from "lucide-react";
import QueueStatGrid from "./QueueStatGrid";

export default function QueueStats({ waiting, estimatedWait, serviceTime }) {
  return (
    <QueueStatGrid
      stats={[
        {
          icon: <Users className="w-4 h-4" />,
          value: waiting,
          label: "Waiting",
        },
        {
          icon: <Clock className="w-4 h-4" />,
          value: `~${estimatedWait || 0}m`,
          label: "Est. wait",
        },
        {
          icon: <Timer className="w-4 h-4" />,
          value: `~${serviceTime || 0}m`,
          label: "Service time",
        },
      ]}
    />
  );
}
