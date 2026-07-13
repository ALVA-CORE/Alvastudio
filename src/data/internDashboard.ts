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
type TrendPoint = { month: string; prompts: number; stimuli: number };
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

const TREND_12M: TrendPoint[] = [
  { month: "Jan", prompts: 120, stimuli: 66 },
  { month: "Feb", prompts: 148, stimuli: 92 },
  { month: "Mar", prompts: 132, stimuli: 88 },
  { month: "Apr", prompts: 176, stimuli: 104 },
  { month: "May", prompts: 164, stimuli: 118 },
  { month: "Jun", prompts: 198, stimuli: 126 },
  { month: "Jul", prompts: 210, stimuli: 138 },
  { month: "Aug", prompts: 224, stimuli: 152 },
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
    captureTrend: TREND_12M.slice(-2),
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
    captureTrend: TREND_12M.slice(-4),
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
    captureTrend: TREND_12M.slice(-6),
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
