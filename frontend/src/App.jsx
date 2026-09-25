import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import QueueBrowse from "./pages/QueueBrowse";
import QueueLanding from "./pages/QueueLanding";
import JoinQueue from "./pages/JoinQueue";
import QueueStatus from "./pages/QueueStatus";
import MyTickets from "./pages/MyTickets";
import PublicCampaign from "./pages/PublicCampaign";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<QueueBrowse />} />
        <Route path="/q/:queueId" element={<QueueLanding />} />
        <Route path="/join/:queueId" element={<JoinQueue />} />
        <Route path="/t/:customerToken" element={<QueueStatus />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/campaign/:slug" element={<PublicCampaign />} />
        <Route path="/campaign/:slug/live" element={<PublicCampaign live />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
