import { MotionConfig, MatchState } from './types';

export const DEFAULT_MOTION_CONFIG: MotionConfig = {
  sensitivity: 400, 
  cooldownMs: 3000, 
};

export const INITIAL_MATCH_STATE: MatchState = {
  totalOvers: 5,
  playersPerTeam: 11,
  homeTeamName: 'Home Team',
  awayTeamName: 'Away Team',
  
  innings: 1,
  battingTeam: 'Home Team',
  bowlingTeam: 'Away Team',
  
  currentOver: 0,
  currentBall: 0,
  totalRuns: 0,
  wickets: 0,
  
  target: null,
  firstInningsScore: null,
  
  history: [],
  isMatchOver: false,
  matchResult: null
};

export const EXTRAS = ['WD', 'NB', 'LB', 'B'];