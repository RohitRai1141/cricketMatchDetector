import React from 'react';
import { MatchState } from '../types';

interface ScoreBoardProps {
  state: MatchState;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ state }) => {
  const calculateRunRate = () => {
    const totalBallsBowled = state.currentOver * 6 + state.currentBall;
    if (totalBallsBowled === 0) return 0;
    const oversFraction = totalBallsBowled / 6;
    return (state.totalRuns / oversFraction).toFixed(2);
  };

  const ballsRemaining = (state.totalOvers * 6) - (state.currentOver * 6 + state.currentBall);
  const runsNeeded = state.target ? state.target - state.totalRuns : 0;

  return (
    <div className="w-full p-4 bg-gradient-to-br from-emerald-900 to-gray-900 border border-emerald-500/30 rounded-xl shadow-xl text-white">
      {/* Header: Teams & CRR */}
      <div className="flex justify-between items-start mb-3 border-b border-gray-700 pb-2">
        <div>
           <h2 className="text-lg font-bold text-white truncate max-w-[150px]">{state.battingTeam}</h2>
           <span className="text-xs text-emerald-400 uppercase font-semibold">
               {state.innings === 1 ? '1st Innings' : '2nd Innings'}
           </span>
        </div>
        <div className="text-right">
             <span className="text-xs text-gray-400 block font-mono">CRR: {calculateRunRate()}</span>
             {state.innings === 2 && (
                 <span className="text-xs text-yellow-400 block font-mono">Req: {ballsRemaining > 0 ? (runsNeeded / (ballsRemaining/6)).toFixed(2) : '-'}</span>
             )}
        </div>
      </div>
      
      {/* Main Score Area */}
      <div className="flex items-baseline justify-between mb-4">
        <div className="flex flex-col">
          <span className="text-6xl font-bold font-mono tracking-tighter text-white">
            {state.totalRuns}/{state.wickets}
          </span>
          
          {state.innings === 1 ? (
             <span className="text-sm text-gray-400 mt-1">
                Target: Setting...
             </span>
          ) : (
             <span className="text-sm text-yellow-300 mt-1 font-medium animate-pulse">
                Target: {state.target} ({runsNeeded} off {ballsRemaining})
             </span>
          )}
        </div>
        
        <div className="text-right">
          <div className="text-4xl font-bold text-emerald-100 font-mono">
            {state.currentOver}.{state.currentBall}
          </div>
          <div className="text-xs text-gray-400 uppercase mt-1">Overs / {state.totalOvers}</div>
        </div>
      </div>

      {/* Progress & Status */}
      <div className="flex gap-1 justify-between items-center bg-black/20 p-2 rounded-lg">
          <span className="text-xs text-gray-400">This Over:</span>
          <div className="flex gap-1">
             {[...Array(6)].map((_, i) => (
                <div 
                    key={i} 
                    className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                        i < state.currentBall ? 'bg-emerald-400' : 'bg-gray-700'
                    }`} 
                />
             ))}
          </div>
          <span className="text-xs text-gray-400">{ballsRemaining} balls left</span>
      </div>
    </div>
  );
};

export default ScoreBoard;