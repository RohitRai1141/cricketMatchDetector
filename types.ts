export enum AppScreen {
  SETUP = 'SETUP',
  LIVE = 'LIVE',
  SUMMARY = 'SUMMARY'
}

export interface BallEvent {
  over: number;
  ballInOver: number;
  runs: number;
  isWicket: boolean;
  timestamp: number;
  innings: number; // Added to track which innings this ball belongs to
}

export interface MatchState {
  // Config
  totalOvers: number;
  playersPerTeam: number;
  homeTeamName: string;
  awayTeamName: string;

  // Live State
  innings: 1 | 2;
  battingTeam: string;
  bowlingTeam: string;
  
  // Scoring
  currentOver: number;
  currentBall: number; // 0-5
  totalRuns: number;
  wickets: number;
  
  // Context
  target: number | null; // Null in 1st innings
  firstInningsScore: { runs: number; wickets: number; overs: string } | null;
  
  history: BallEvent[];
  isMatchOver: boolean;
  matchResult: string | null; // e.g., "Home Team won by 10 runs"
}

export interface MotionConfig {
  sensitivity: number; // 0-100
  cooldownMs: number;
}