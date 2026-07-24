export type DashboardTimeRange = "7d" | "30d" | "90d" | "12m";

export const DASHBOARD_TIME_RANGES: Array<{
  id: DashboardTimeRange;
  label: string;
}> = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "12m", label: "12M" },
];

type WeeklyPoint = { day: string; sessions: number };
type TrendPoint = { month: string; hours: number; participants: number; sessions: number };
type RadarPoint = { metric: string; score: number };

type DashboardDataset = {
  weeklySessions: WeeklyPoint[];
  captureTrend: TrendPoint[];
  qualityRadar: RadarPoint[];
  metrics: {
    hours: string;
    participants: string;
    clipsReviewed: string;
    sessions: string;
    hoursTrend: string;
    participantsTrend: string;
    clipsTrend: string;
    sessionsTrend: string;
    periodLabel: string;
  };
};

const WEEKLY_7D: WeeklyPoint[] = [
  { day: "Mon", sessions: 4 },
  { day: "Tue", sessions: 7 },
  { day: "Wed", sessions: 5 },
  { day: "Thu", sessions: 9 },
  { day: "Fri", sessions: 6 },
  { day: "Sat", sessions: 3 },
  { day: "Sun", sessions: 8 },
];

const TREND_7D: TrendPoint[] = [
  { month: "Mon", hours: 1.2, participants: 5, sessions: 2 },
  { month: "Tue", hours: 1.8, participants: 7, sessions: 3 },
  { month: "Wed", hours: 1.4, participants: 6, sessions: 2 },
  { month: "Thu", hours: 2.1, participants: 9, sessions: 4 },
  { month: "Fri", hours: 1.6, participants: 7, sessions: 3 },
  { month: "Sat", hours: 0.9, participants: 4, sessions: 1 },
  { month: "Sun", hours: 1.2, participants: 5, sessions: 2 },
];

const TREND_30D: TrendPoint[] = [
  { month: "Wk 1", hours: 8.5, participants: 48, sessions: 12 },
  { month: "Wk 2", hours: 9.8, participants: 52, sessions: 14 },
  { month: "Wk 3", hours: 9.2, participants: 49, sessions: 13 },
  { month: "Wk 4", hours: 10.4, participants: 55, sessions: 15 },
];

const TREND_90D: TrendPoint[] = [
  { month: "Jun", hours: 32, participants: 168, sessions: 48 },
  { month: "Jul", hours: 36, participants: 182, sessions: 52 },
  { month: "Aug", hours: 38, participants: 196, sessions: 54 },
  { month: "Sep", hours: 34, participants: 174, sessions: 49 },
  { month: "Oct", hours: 39, participants: 205, sessions: 56 },
  { month: "Nov", hours: 41, participants: 214, sessions: 58 },
];

const TREND_12M: TrendPoint[] = [
  { month: "Jan", hours: 28, participants: 142, sessions: 38 },
  { month: "Feb", hours: 32, participants: 158, sessions: 42 },
  { month: "Mar", hours: 30, participants: 149, sessions: 40 },
  { month: "Apr", hours: 36, participants: 176, sessions: 48 },
  { month: "May", hours: 34, participants: 164, sessions: 44 },
  { month: "Jun", hours: 38, participants: 188, sessions: 50 },
  { month: "Jul", hours: 40, participants: 198, sessions: 52 },
  { month: "Aug", hours: 42, participants: 210, sessions: 56 },
];

const RADAR_BASE: RadarPoint[] = [
  { metric: "Clarity", score: 82 },
  { metric: "Noise", score: 74 },
  { metric: "Pacing", score: 88 },
  { metric: "Accent", score: 91 },
  { metric: "Completeness", score: 79 },
  { metric: "Metadata", score: 85 },
];

export const DASHBOARD_DATA: Record<DashboardTimeRange, DashboardDataset> = {
  "7d": {
    weeklySessions: WEEKLY_7D,
    captureTrend: TREND_7D,
    qualityRadar: RADAR_BASE.map((item) => ({
      ...item,
      score: Math.min(100, item.score + 4),
    })),
    metrics: {
      hours: "9.2h",
      participants: "38",
      clipsReviewed: "186",
      sessions: "14",
      hoursTrend: "+6%",
      participantsTrend: "+4%",
      clipsTrend: "+9%",
      sessionsTrend: "+2%",
      periodLabel: "last 7 days",
    },
  },
  "30d": {
    weeklySessions: WEEKLY_7D,
    captureTrend: TREND_30D,
    qualityRadar: RADAR_BASE,
    metrics: {
      hours: "38.5h",
      participants: "214",
      clipsReviewed: "1,042",
      sessions: "56",
      hoursTrend: "+12%",
      participantsTrend: "+8%",
      clipsTrend: "+18%",
      sessionsTrend: "-3%",
      periodLabel: "last 30 days",
    },
  },
  "90d": {
    weeklySessions: WEEKLY_7D.map((item) => ({
      ...item,
      sessions: Math.round(item.sessions * 1.15),
    })),
    captureTrend: TREND_90D,
    qualityRadar: RADAR_BASE.map((item) => ({
      ...item,
      score: Math.max(60, item.score - 3),
    })),
    metrics: {
      hours: "112h",
      participants: "580",
      clipsReviewed: "2,940",
      sessions: "164",
      hoursTrend: "+15%",
      participantsTrend: "+11%",
      clipsTrend: "+14%",
      sessionsTrend: "+5%",
      periodLabel: "last 90 days",
    },
  },
  "12m": {
    weeklySessions: WEEKLY_7D.map((item) => ({
      ...item,
      sessions: Math.round(item.sessions * 1.3),
    })),
    captureTrend: TREND_12M,
    qualityRadar: RADAR_BASE.map((item) => ({
      ...item,
      score: Math.max(58, item.score - 6),
    })),
    metrics: {
      hours: "428h",
      participants: "2,140",
      clipsReviewed: "11,280",
      sessions: "612",
      hoursTrend: "+22%",
      participantsTrend: "+19%",
      clipsTrend: "+24%",
      sessionsTrend: "+12%",
      periodLabel: "last 12 months",
    },
  },
};
