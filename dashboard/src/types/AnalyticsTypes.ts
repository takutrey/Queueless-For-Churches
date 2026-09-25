export interface AnalyticsSummary {
  waitingNow: number;
  servingNow: number;
  completedServes: number;
  skippedServes: number;
  averageServiceMinutes: number;
  averageWaitMinutes: number;
  transfersReceived: number;
  transfersOut: number;
}

export interface AnalyticsQueue {
  id: string;
  name: string;
  waiting: number;
  serving: number;
  completed: number;
  transfers: number;
}

export interface AnalyticsStaffMember {
  id: string;
  name: string;
  role?: string;
  completed: number;
  transfersOut: number;
  serviceMinutes: number;
  averageServiceMinutes: number;
}

export interface AnalyticsData {
  period: { days: number; from: string };
  scope: { role: string; queueCount: number; memberCount?: number };
  summary: AnalyticsSummary;
  daily: Array<{ date: string; completed: number; transfers: number }>;
  queues: AnalyticsQueue[];
  staff: AnalyticsStaffMember[];
  statusBreakdown: Array<{ status: string; count: number }>;
  fundraising: FundraisingAnalytics | null;
}

export interface FundraisingAnalytics {
  summary: {
    campaignCount: number;
    activeCampaigns: number;
    pledgeCount: number;
    totalTarget: number;
    totalPledged: number;
    totalCollected: number;
    remainingToCollect: number;
  };
  daily: Array<{
    date: string;
    pledged: number;
    collected: number;
    pledges: number;
  }>;
  campaigns: Array<{
    id: string;
    title: string;
    status: string;
    targetAmount: number;
    pledgedAmount: number;
    collectedAmount: number;
    remainingAmount: number;
    pledgeCount: number;
    materials: Array<{
      id: string;
      name: string;
      unit: string;
      targetQuantity: number;
      pledgedQuantity: number;
      fulfilledQuantity: number;
    }>;
  }>;
  topDonors: Array<{
    id: string;
    name: string;
    phone: string;
    pledged: number;
    collected: number;
    pledgeCount: number;
  }>;
  materials: Array<{
    id: string;
    name: string;
    unit: string;
    targetQuantity: number;
    pledgedQuantity: number;
    fulfilledQuantity: number;
    remainingQuantity: number;
  }>;
}
