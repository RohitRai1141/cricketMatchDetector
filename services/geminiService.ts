import { GoogleGenAI, Type } from "@google/genai";
import { MatchState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface MatchSummaryData {
  headline: string;
  body: string;
  highlights: string[];
  advice: string;
}

export const generateMatchSummary = async (matchState: MatchState): Promise<MatchSummaryData | string> => {
  try {
    const prompt = `
      Act as a cricket data analyst. 
      Provide a factual, statistics-driven summary of the match.
      Do NOT use flowery language, quotes, or storytelling. Focus on the numbers.
      
      Match Result: ${matchState.matchResult || "Match ended prematurely"}
      
      1st Innings (${matchState.innings === 2 ? matchState.bowlingTeam : matchState.battingTeam}): 
      ${matchState.firstInningsScore ? `${matchState.firstInningsScore.runs}/${matchState.firstInningsScore.wickets} in ${matchState.firstInningsScore.overs} overs` : `${matchState.totalRuns}/${matchState.wickets} (In Progress)`}
      
      2nd Innings (${matchState.innings === 2 ? matchState.battingTeam : "Did not bat"}):
      ${matchState.innings === 2 ? `${matchState.totalRuns}/${matchState.wickets} in ${matchState.currentOver}.${matchState.currentBall} overs` : "N/A"}
      
      Target was: ${matchState.target || "N/A"}
      
      History (Last 12 balls of play): ${JSON.stringify(matchState.history.slice(-12))}

      Output Format: JSON
      - headline: A short factual headline (e.g., "Team A wins by 10 runs").
      - body: A 2-3 sentence technical analysis of why the winning team won (e.g., "Higher run rate in powerplay", "Economical bowling in death overs").
      - highlights: List of 3 key statistical moments (e.g., "Over 2: 15 runs scored", "Wicket in Over 4 halted momentum").
      - advice: One tactical improvement for the losing team based on stats.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            body: { type: Type.STRING },
            highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
            advice: { type: Type.STRING }
          }
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as MatchSummaryData;
    }
    throw new Error("No response text");

  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate AI summary at this time.";
  }
};