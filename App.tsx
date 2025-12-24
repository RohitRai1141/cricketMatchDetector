import React, { useState, useEffect, useCallback } from 'react';
import { Mic, Undo2, XCircle, Video, Trophy, Star, Lightbulb, Activity, ArrowRight, Save } from 'lucide-react';
import CameraDetector from './components/CameraDetector';
import ScoreBoard from './components/ScoreBoard';
import SetupScreen from './components/SetupScreen';
import { AppScreen, MatchState, BallEvent } from './types';
import { INITIAL_MATCH_STATE } from './constants';

// --- Local Match Summary Logic (Previously in geminiService.ts) ---
export interface MatchSummaryData {
  headline: string;
  body: string;
  highlights: string[];
  advice: string;
}

const generateMatchSummary = async (matchState: MatchState): Promise<MatchSummaryData | string> => {
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
// ------------------------------------------------------------------

export default function App() {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.SETUP);
  const [matchState, setMatchState] = useState<MatchState>(INITIAL_MATCH_STATE);
  const [pendingInput, setPendingInput] = useState(false);
  const [summary, setSummary] = useState<MatchSummaryData | string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [matchVideoBlob, setMatchVideoBlob] = useState<Blob | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cricketMatchState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.isMatchOver) {
          setMatchState(parsed);
          setScreen(AppScreen.LIVE);
        }
      } catch (e) {
        console.error("Failed to load saved match");
      }
    }
  }, []);

  useEffect(() => {
    if (screen === AppScreen.LIVE) {
      localStorage.setItem('cricketMatchState', JSON.stringify(matchState));
    }
  }, [matchState, screen]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const handleStartMatch = (config: Partial<MatchState>) => {
    setMatchState({ ...INITIAL_MATCH_STATE, ...config });
    setScreen(AppScreen.LIVE);
  };

  const handleBallDetection = () => {
    if (!pendingInput && !matchState.isMatchOver) {
      if (navigator.vibrate) navigator.vibrate(200);
      setPendingInput(true);
    }
  };

  const processScore = (runs: number, isWicket: boolean) => {
    setMatchState(prev => {
      let { currentBall, currentOver, totalRuns, wickets, totalOvers, history, innings, battingTeam, bowlingTeam, playersPerTeam } = prev;

      // 1. Update Basic Stats
      const newRuns = totalRuns + runs;
      const newWickets = isWicket ? wickets + 1 : wickets;
      
      let newBall = currentBall + 1;
      let newOver = currentOver;
      
      const event: BallEvent = {
        over: currentOver,
        ballInOver: newBall,
        runs,
        isWicket,
        timestamp: Date.now(),
        innings
      };

      const newHistory = [...history, event];

      // Speech Feedback
      let speech = `${runs} runs.`;
      if (isWicket) speech = "Wicket!";

      // 2. End of Over Logic
      if (newBall >= 6) {
        newBall = 0;
        newOver += 1;
        speech += ` End of over ${newOver}.`;
      } else {
        speech += ` ${newOver} point ${newBall}`;
      }

      // 3. Game Logic Variables
      const isAllOut = newWickets >= playersPerTeam - 1;
      const isOversDone = newOver >= totalOvers;
      
      let nextState = {
        ...prev,
        currentBall: newBall,
        currentOver: newOver,
        totalRuns: newRuns,
        wickets: newWickets,
        history: newHistory,
      };

      // 4. Check End Conditions
      if (innings === 1) {
        // --- End of First Innings ---
        if (isAllOut || isOversDone) {
           speak("End of first innings. Switching teams.");
           
           return {
             ...nextState,
             innings: 2,
             battingTeam: bowlingTeam,
             bowlingTeam: battingTeam,
             currentOver: 0,
             currentBall: 0,
             totalRuns: 0,
             wickets: 0,
             target: newRuns + 1,
             firstInningsScore: { runs: newRuns, wickets: newWickets, overs: `${newOver}.${newBall}` },
             // Keep history, but reset live counters
           };
        }
      } else {
        // --- End of Second Innings ---
        const target = prev.target || 0;
        
        // Condition A: Batting Team Chases Target
        if (newRuns >= target) {
           const result = `${battingTeam} wins by ${playersPerTeam - 1 - newWickets} wickets!`;
           speak(`Match Over. ${result}`);
           return { ...nextState, isMatchOver: true, matchResult: result };
        }

        // Condition B: All Out or Overs Done (Defending Team Wins or Tie)
        if (isAllOut || isOversDone) {
           let result = "";
           if (newRuns === target - 1) {
             result = "Match Tied!";
           } else {
             const margin = target - 1 - newRuns;
             result = `${bowlingTeam} wins by ${margin} runs!`;
           }
           speak(`Match Over. ${result}`);
           return { ...nextState, isMatchOver: true, matchResult: result };
        }
      }

      speak(speech);
      return nextState;
    });

    setPendingInput(false);
  };

  const handleUndo = () => {
    if (matchState.history.length === 0) return;

    setMatchState(prev => {
      const newHistory = [...prev.history];
      const lastEvent = newHistory.pop();
      if (!lastEvent) return prev;

      // Prevent undoing back into the previous innings
      if (lastEvent.innings !== prev.innings) {
        alert("Cannot undo into the previous innings.");
        return prev;
      }

      const newRuns = prev.totalRuns - lastEvent.runs;
      const newWickets = lastEvent.isWicket ? prev.wickets - 1 : prev.wickets;
      
      let newBall = prev.currentBall - 1;
      let newOver = prev.currentOver;

      if (newBall < 0) {
        newBall = 5;
        newOver = prev.currentOver - 1;
      }

      return {
        ...prev,
        totalRuns: newRuns,
        wickets: newWickets,
        currentBall: newBall,
        currentOver: newOver,
        history: newHistory,
        isMatchOver: false,
        matchResult: null
      };
    });
    setPendingInput(false);
  };

  const endMatch = async () => {
    setScreen(AppScreen.SUMMARY);
    setLoadingSummary(true);
    // Simulate slight delay for "calculation" effect
    setTimeout(async () => {
        const result = await generateMatchSummary(matchState);
        setSummary(result);
        setLoadingSummary(false);
        localStorage.removeItem('cricketMatchState');
    }, 500);
  };

  const handleVideoAvailable = (blob: Blob) => {
    setMatchVideoBlob(blob);
  };

  const downloadVideo = () => {
    if (!matchVideoBlob) return;
    const url = URL.createObjectURL(matchVideoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match-${new Date().toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const calculateRR = (runs: number, oversStr: string) => {
    const [overs, balls] = oversStr.split('.').map(Number);
    const totalDec = overs + (balls || 0) / 6;
    if (totalDec === 0) return '0.00';
    return (runs / totalDec).toFixed(2);
  };

  if (screen === AppScreen.SETUP) {
    return <SetupScreen onStart={handleStartMatch} />;
  }

  if (screen === AppScreen.SUMMARY) {
    const firstInnings = matchState.firstInningsScore;
    const secondInnings = {
        runs: matchState.totalRuns,
        wickets: matchState.wickets,
        overs: `${matchState.currentOver}.${matchState.currentBall}`
    };

    const team1Name = matchState.innings === 2 ? matchState.bowlingTeam : matchState.battingTeam;
    const team2Name = matchState.innings === 2 ? matchState.battingTeam : matchState.bowlingTeam;

    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-6 text-emerald-400 flex items-center gap-3">
            <Trophy className="text-yellow-400" size={32} />
            Match Summary
        </h1>
        
        {matchState.matchResult && (
           <div className="bg-emerald-900/50 border border-emerald-500/50 p-4 rounded-xl mb-6 text-center shadow-lg shadow-emerald-900/20">
              <h2 className="text-xl font-bold text-white uppercase tracking-widest">{matchState.matchResult}</h2>
           </div>
        )}

        {/* Stats Grid */}
        <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 mb-6 shadow-xl">
             <div className="grid grid-cols-4 bg-gray-700/50 p-3 text-xs uppercase font-bold text-gray-400 border-b border-gray-700">
                <div className="col-span-1">Team</div>
                <div className="text-center">Score</div>
                <div className="text-center">Overs</div>
                <div className="text-right">Run Rate</div>
             </div>

             {/* Row 1 */}
             <div className="grid grid-cols-4 p-4 items-center border-b border-gray-700/50">
                <div className="font-bold text-emerald-400 col-span-1 truncate">{team1Name}</div>
                <div className="text-center font-mono font-bold text-xl">
                    {firstInnings ? `${firstInnings.runs}/${firstInnings.wickets}` : '-'}
                </div>
                <div className="text-center text-gray-400">
                    {firstInnings ? firstInnings.overs : '-'}
                </div>
                <div className="text-right font-mono text-yellow-400">
                    {firstInnings ? calculateRR(firstInnings.runs, firstInnings.overs) : '-'}
                </div>
             </div>

             {/* Row 2 */}
             <div className="grid grid-cols-4 p-4 items-center">
                <div className="font-bold text-emerald-400 col-span-1 truncate">{team2Name}</div>
                <div className="text-center font-mono font-bold text-xl">
                    {matchState.innings === 2 ? `${secondInnings.runs}/${secondInnings.wickets}` : '-'}
                </div>
                <div className="text-center text-gray-400">
                    {matchState.innings === 2 ? secondInnings.overs : '-'}
                </div>
                <div className="text-right font-mono text-yellow-400">
                    {matchState.innings === 2 ? calculateRR(secondInnings.runs, secondInnings.overs) : '-'}
                </div>
             </div>
        </div>

        {loadingSummary ? (
          <div className="animate-pulse flex flex-col gap-4">
            <div className="h-32 bg-gray-800 rounded-xl w-full border border-gray-700"></div>
            <p className="text-center text-sm text-emerald-400 mt-4 flex justify-center items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                Calculating stats...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {typeof summary !== 'string' && (
                <>
                    {/* Analysis Card */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <div className="flex items-center gap-2 mb-3 text-emerald-400 font-bold uppercase text-xs tracking-wider">
                            <Activity size={16} /> Match Analysis
                        </div>
                        <h2 className="text-lg font-bold text-white mb-2">{summary.headline}</h2>
                        <p className="text-sm text-gray-300 leading-relaxed border-l-2 border-emerald-500 pl-3">
                            {summary.body}
                        </p>
                    </div>

                    {/* Highlights & Tips Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                            <h3 className="text-xs uppercase tracking-wider text-yellow-500 font-bold mb-3 flex items-center gap-2">
                                <Star size={14} /> Highlights
                            </h3>
                            <ul className="space-y-2">
                                {summary.highlights.map((h, i) => (
                                    <li key={i} className="flex gap-2 items-start text-sm text-gray-300">
                                        <ArrowRight size={14} className="mt-1 text-gray-500 shrink-0" />
                                        {h}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                            <h3 className="text-xs uppercase tracking-wider text-blue-400 font-bold mb-3 flex items-center gap-2">
                                <Lightbulb size={14} /> Insight
                            </h3>
                            <p className="text-sm text-gray-300 leading-relaxed">
                                {summary.advice}
                            </p>
                        </div>
                    </div>
                </>
            )}
          </div>
        )}

        <button 
          onClick={() => {
              setMatchVideoBlob(null);
              setScreen(AppScreen.SETUP);
          }}
          className="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50 py-4 rounded-xl font-bold transition-all active:scale-95"
        >
          Start New Match
        </button>
      </div>
    );
  }

  // --- LIVE SCREEN ---
  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-none p-4 flex justify-between items-center bg-gray-800 border-b border-gray-700 z-10 shadow-md">
        <h1 className="font-bold text-emerald-400 flex items-center gap-2">
           <Activity size={18} />
           {matchState.isMatchOver ? 'Match Result' : 'Live Match'}
        </h1>
        <div className="flex gap-2">
           <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`p-2 rounded-full ${voiceEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
              <Mic size={18} />
           </button>
           <button onClick={handleUndo} className="p-2 bg-gray-700 rounded-full text-white active:scale-95 hover:bg-gray-600">
             <Undo2 size={18} />
           </button>
           <button onClick={endMatch} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold border border-red-500/50 hover:bg-red-500/30">
             END
           </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Scoreboard */}
        <ScoreBoard state={matchState} />
        
        {/* Camera Container - Increased Height */}
        <div className="w-full h-[60vh] min-h-[300px] shrink-0 shadow-2xl">
            <CameraDetector 
                isActive={!matchState.isMatchOver && !pendingInput} 
                onMotionDetected={handleBallDetection} 
                onVideoAvailable={handleVideoAvailable}
            />
        </div>

        {/* Input Trigger / Status */}
        {!pendingInput && !matchState.isMatchOver && (
            <div className="text-center pb-8">
                <button 
                  onClick={() => setPendingInput(true)} 
                  className="bg-gray-800 border border-gray-600 px-6 py-3 rounded-full text-emerald-400 font-bold shadow-lg active:scale-95 transition-all"
                >
                    + Add Score Manually
                </button>
                <p className="text-xs text-gray-500 mt-2">
                    Camera is monitoring...
                </p>
            </div>
        )}
        
        {matchState.isMatchOver && (
             <div className="bg-emerald-900/50 border border-emerald-500 p-6 rounded-xl text-center mb-8">
                 <h2 className="text-2xl font-bold text-white mb-4">{matchState.matchResult}</h2>
                 <button onClick={endMatch} className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-emerald-500/30 transition-all">
                    View Stats
                 </button>
             </div>
        )}
      </div>

      {/* Slide-up Input Panel */}
      <div 
        className={`fixed inset-x-0 bottom-0 bg-gray-800 border-t-2 border-emerald-600 rounded-t-3xl shadow-2xl transition-transform duration-300 transform ${pendingInput ? 'translate-y-0' : 'translate-y-full'} z-50 max-h-[60vh] overflow-y-auto`}
      >
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                   <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                   {matchState.battingTeam} Batting
                </h3>
                <button onClick={() => setPendingInput(false)} className="bg-gray-700 p-2 rounded-full text-gray-400 hover:text-white">
                    <XCircle size={20} />
                </button>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
                {[0, 1, 2, 3, 4, 6].map(run => (
                    <button
                        key={run}
                        onClick={() => processScore(run, false)}
                        className={`py-4 rounded-xl font-bold text-2xl shadow-lg active:scale-95 transition-all border-b-4 
                            ${run === 4 || run === 6 
                                ? 'bg-indigo-600 text-white border-indigo-800 hover:bg-indigo-500' 
                                : 'bg-gray-700 text-white border-gray-900 hover:bg-gray-600'}`}
                    >
                        {run}
                    </button>
                ))}
                <button
                    onClick={() => processScore(0, true)}
                    className="col-span-2 py-4 rounded-xl font-bold text-xl bg-red-600 text-white border-b-4 border-red-800 hover:bg-red-500 shadow-lg active:scale-95 uppercase tracking-wider"
                >
                    OUT
                </button>
            </div>
            <div className="text-center">
                 <button onClick={() => setPendingInput(false)} className="text-xs text-gray-400 underline hover:text-gray-300">
                    Cancel Entry
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
}