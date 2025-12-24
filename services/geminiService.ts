import { MatchState } from "../types";

export interface MatchSummaryData {
  headline: string;
  body: string;
  highlights: string[];
  advice: string;
}

// Deterministic Match Summary Generator (Offline)
export const generateMatchSummary = async (matchState: MatchState): Promise<MatchSummaryData | string> => {
  // 1. Determine Result Headline
  const headline = matchState.matchResult || "Match In Progress";

  // 2. Statistics Calculation
  const runRate = (matchState.totalRuns / Math.max(0.1, matchState.currentOver + matchState.currentBall/6)).toFixed(2);
  const totalBalls = matchState.currentOver * 6 + matchState.currentBall;
  const dotBalls = matchState.history.filter(b => b.runs === 0 && !b.isWicket).length;
  const boundaries = matchState.history.filter(b => b.runs === 4 || b.runs === 6).length;
  
  // 3. Generate Highlights
  const highlights: string[] = [];
  
  // Find big overs (>10 runs)
  const runsPerOver: Record<number, number> = {};
  matchState.history.forEach(b => {
    runsPerOver[b.over] = (runsPerOver[b.over] || 0) + b.runs;
  });
  
  Object.entries(runsPerOver).forEach(([over, runs]) => {
    if (runs >= 10) highlights.push(`Big Over: ${runs} runs scored in Over ${Number(over) + 1}.`);
  });

  // Wickets
  if (matchState.wickets > 0) {
      highlights.push(`Bowling team took ${matchState.wickets} wickets.`);
  } else {
      highlights.push(`Batting team lost 0 wickets.`);
  }

  highlights.push(`${boundaries} Boundaries hit.`);

  // 4. Generate Body Analysis
  let body = "";
  if (matchState.innings === 2 && matchState.target) {
      const required = matchState.target - matchState.totalRuns;
      if (matchState.isMatchOver) {
           body = `${matchState.matchResult}. The batting team ended with a run rate of ${runRate}.`;
      } else {
           body = `Chasing ${matchState.target}, the team needs ${required} more runs. Current Run Rate is ${runRate}.`;
      }
  } else {
      body = `First Innings complete. Team scored ${matchState.totalRuns} for ${matchState.wickets}. Run Rate: ${runRate}.`;
  }

  // 5. Tactical Advice
  let advice = "";
  const dotBallPercentage = (dotBalls / Math.max(1, totalBalls)) * 100;
  
  if (parseFloat(runRate) < 6) {
      advice = "Run rate is low. Try to rotate strike more often to keep the scoreboard ticking.";
  } else if (matchState.wickets > (matchState.playersPerTeam / 2)) {
      advice = "Lost too many wickets early. Middle order needs to consolidate.";
  } else if (dotBallPercentage > 50) {
      advice = `Dot ball percentage is high (${dotBallPercentage.toFixed(0)}%). Focus on finding gaps.`;
  } else {
      advice = "Great momentum. Keep playing aggressively.";
  }

  return {
    headline,
    body,
    highlights: highlights.slice(0, 5), // Top 5 highlights
    advice
  };
};