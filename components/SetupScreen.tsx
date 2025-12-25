import React, { useState } from 'react';
import { Trophy, Users, Clock, ArrowRight, Play, FastForward, RotateCcw } from 'lucide-react';
import { INITIAL_MATCH_STATE } from '../constants';
import { MatchState } from '../types';

interface SetupScreenProps {
  onStart: (config: Partial<MatchState>) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onStart }) => {
  const [mode, setMode] = useState<'NEW' | 'CHASE' | 'RESUME'>('NEW');

  // Shared State
  const [homeTeam, setHomeTeam] = useState('Home Team');
  const [awayTeam, setAwayTeam] = useState('Away Team');
  const [overs, setOvers] = useState(INITIAL_MATCH_STATE.totalOvers);
  const [players, setPlayers] = useState(INITIAL_MATCH_STATE.playersPerTeam);

  // Chase Mode Specific
  const [chasePlayers, setChasePlayers] = useState(INITIAL_MATCH_STATE.playersPerTeam);

  // 1st Innings Data (Used in Chase Mode & Resume Innings 2)
  const [firstInningsRuns, setFirstInningsRuns] = useState<string>('');
  const [firstInningsWickets, setFirstInningsWickets] = useState<string>('');
  const [firstInningsOvers, setFirstInningsOvers] = useState<string>('');

  // Resume Mode Specific
  const [resumeInnings, setResumeInnings] = useState<1 | 2>(1);
  const [currentRuns, setCurrentRuns] = useState<string>('');
  const [currentWickets, setCurrentWickets] = useState<string>('');
  const [currentOvers, setCurrentOvers] = useState<string>(''); // e.g., "10.3"

  const handleStartMatch = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({
      totalOvers: overs,
      playersPerTeam: players,
      homeTeamName: homeTeam,
      awayTeamName: awayTeam,
      innings: 1,
      battingTeam: homeTeam,
      bowlingTeam: awayTeam,
    });
  };

  const handleStartChase = (e: React.FormEvent) => {
    e.preventDefault();
    
    const runs = parseInt(firstInningsRuns) || 0;
    const wickets = parseInt(firstInningsWickets) || 0;
    
    // Determine total match overs from the 1st innings input
    let derivedTotalOvers = 20; 
    if (firstInningsOvers) {
        const parsed = parseFloat(firstInningsOvers);
        if (!isNaN(parsed) && parsed > 0) {
            derivedTotalOvers = Math.ceil(parsed);
        }
    }

    onStart({
      homeTeamName: homeTeam,
      awayTeamName: awayTeam,
      totalOvers: derivedTotalOvers,
      playersPerTeam: chasePlayers,
      innings: 2,
      battingTeam: awayTeam,
      bowlingTeam: homeTeam,
      target: runs + 1,
      firstInningsScore: {
          runs: runs,
          wickets: wickets,
          overs: firstInningsOvers || `${derivedTotalOvers}.0`
      },
      currentOver: 0,
      currentBall: 0,
      totalRuns: 0,
      wickets: 0,
      history: []
    });
  };

  const handleStartResume = (e: React.FormEvent) => {
    e.preventDefault();

    const cRuns = parseInt(currentRuns) || 0;
    const cWickets = parseInt(currentWickets) || 0;
    const [cOverStr, cBallStr] = (currentOvers || '0.0').split('.');
    const cOver = parseInt(cOverStr) || 0;
    const cBall = parseInt(cBallStr) || 0;

    const baseConfig = {
        totalOvers: overs,
        playersPerTeam: players,
        homeTeamName: homeTeam,
        awayTeamName: awayTeam,
        currentOver: cOver,
        currentBall: cBall >= 6 ? 0 : cBall,
        totalRuns: cRuns,
        wickets: cWickets,
        history: [],
    };

    if (resumeInnings === 1) {
        onStart({
            ...baseConfig,
            innings: 1,
            battingTeam: homeTeam,
            bowlingTeam: awayTeam,
        });
    } else {
        const fRuns = parseInt(firstInningsRuns) || 0;
        const fWickets = parseInt(firstInningsWickets) || 0;
        const fOvers = firstInningsOvers || `${overs}.0`;

        onStart({
            ...baseConfig,
            innings: 2,
            battingTeam: awayTeam,
            bowlingTeam: homeTeam,
            target: fRuns + 1,
            firstInningsScore: {
                runs: fRuns,
                wickets: fWickets,
                overs: fOvers
            }
        });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 overflow-y-auto">
      <div className="w-full max-w-md my-auto">
        <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <Trophy size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Cricket Tracker</h1>
            <p className="text-gray-400 text-sm">Configure your match</p>
        </div>

        {/* Mode Toggle */}
        <div className="bg-gray-800 p-1 rounded-xl flex mb-6 border border-gray-700">
            <button
                onClick={() => setMode('NEW')}
                className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-2 ${
                    mode === 'NEW' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
            >
                <Play size={14} /> New
            </button>
            <button
                onClick={() => setMode('CHASE')}
                className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-2 ${
                    mode === 'CHASE' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
            >
                <FastForward size={14} /> Chase
            </button>
            <button
                onClick={() => setMode('RESUME')}
                className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-2 ${
                    mode === 'RESUME' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
            >
                <RotateCcw size={14} /> Resume
            </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden">
            {/* Background decoration */}
            <div className={`absolute top-0 left-0 w-full h-1 ${mode === 'NEW' ? 'bg-emerald-500' : mode === 'CHASE' ? 'bg-indigo-500' : 'bg-blue-500'}`} />

            {mode === 'NEW' && (
                <form onSubmit={handleStartMatch} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center gap-2 text-emerald-400 text-xs uppercase font-bold mb-2">
                                <Clock size={14} /> Overs
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                value={overs}
                                onChange={(e) => setOvers(Number(e.target.value))}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-emerald-400 text-xs uppercase font-bold mb-2">
                                <Users size={14} /> Players
                            </label>
                            <input
                                type="number"
                                min="2"
                                max="15"
                                value={players}
                                onChange={(e) => setPlayers(Number(e.target.value))}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="text-gray-400 text-xs uppercase font-bold mb-2 block">Home Team (Batting)</label>
                        <input
                            type="text"
                            value={homeTeam}
                            onChange={(e) => setHomeTeam(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-gray-400 text-xs uppercase font-bold mb-2 block">Away Team (Bowling)</label>
                        <input
                            type="text"
                            value={awayTeam}
                            onChange={(e) => setAwayTeam(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>

                    <button type="submit" className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                        Start Match <ArrowRight size={20} />
                    </button>
                </form>
            )}

            {mode === 'CHASE' && (
                <form onSubmit={handleStartChase} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-500/30">
                        <p className="text-xs text-indigo-300 mb-3 font-bold uppercase tracking-wider">1st Innings Summary</p>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                             <div>
                                <label className="text-gray-400 text-[10px] uppercase font-bold mb-1 block">Home Team</label>
                                <input
                                    type="text"
                                    value={homeTeam}
                                    onChange={(e) => setHomeTeam(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-gray-400 text-[10px] uppercase font-bold mb-1 block">Away Team</label>
                                <input
                                    type="text"
                                    value={awayTeam}
                                    onChange={(e) => setAwayTeam(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                             <div>
                                <label className="text-xs text-gray-400 block mb-1">Runs</label>
                                <input type="number" value={firstInningsRuns} onChange={(e) => setFirstInningsRuns(e.target.value)} className="w-full bg-gray-900 border border-indigo-500/50 rounded p-2 text-white text-center" placeholder="0" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Wickets</label>
                                <input type="number" value={firstInningsWickets} onChange={(e) => setFirstInningsWickets(e.target.value)} className="w-full bg-gray-900 border border-indigo-500/50 rounded p-2 text-white text-center" placeholder="0" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Overs</label>
                                <input type="text" value={firstInningsOvers} onChange={(e) => setFirstInningsOvers(e.target.value)} className="w-full bg-gray-900 border border-indigo-500/50 rounded p-2 text-white text-center" placeholder="20.0" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-indigo-400 text-xs uppercase font-bold mb-2"><Users size={14} /> Chase Players</label>
                        <input
                            type="number"
                            min="2"
                            max="15"
                            value={chasePlayers}
                            onChange={(e) => setChasePlayers(Number(e.target.value))}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <button type="submit" className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                        Start Chase <ArrowRight size={20} />
                    </button>
                </form>
            )}

            {mode === 'RESUME' && (
                <form onSubmit={handleStartResume} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-gray-400 text-[10px] uppercase font-bold mb-1 block">Home Team</label>
                            <input
                                type="text"
                                value={homeTeam}
                                onChange={(e) => setHomeTeam(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-gray-400 text-[10px] uppercase font-bold mb-1 block">Away Team</label>
                            <input
                                type="text"
                                value={awayTeam}
                                onChange={(e) => setAwayTeam(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 bg-gray-900/50 p-1 rounded-lg">
                        <button type="button" onClick={() => setResumeInnings(1)} className={`flex-1 text-xs py-2 rounded font-bold transition-all ${resumeInnings === 1 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>1st Innings</button>
                        <button type="button" onClick={() => setResumeInnings(2)} className={`flex-1 text-xs py-2 rounded font-bold transition-all ${resumeInnings === 2 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>2nd Innings</button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Total Overs</label>
                            <input type="number" value={overs} onChange={(e) => setOvers(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Players</label>
                            <input type="number" value={players} onChange={(e) => setPlayers(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm" />
                        </div>
                    </div>

                    <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/30">
                        <p className="text-xs text-blue-300 mb-2 font-bold uppercase">Current Score ({resumeInnings === 1 ? homeTeam : awayTeam})</p>
                        <div className="grid grid-cols-3 gap-2">
                             <div>
                                <label className="text-[10px] text-gray-400 block mb-1">Runs</label>
                                <input type="number" value={currentRuns} onChange={(e) => setCurrentRuns(e.target.value)} className="w-full bg-gray-900 border border-blue-500/50 rounded p-2 text-white text-center text-sm" placeholder="0" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 block mb-1">Wickets</label>
                                <input type="number" value={currentWickets} onChange={(e) => setCurrentWickets(e.target.value)} className="w-full bg-gray-900 border border-blue-500/50 rounded p-2 text-white text-center text-sm" placeholder="0" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 block mb-1">Overs (e.g. 10.3)</label>
                                <input type="text" value={currentOvers} onChange={(e) => setCurrentOvers(e.target.value)} className="w-full bg-gray-900 border border-blue-500/50 rounded p-2 text-white text-center text-sm" placeholder="0.0" />
                            </div>
                        </div>
                    </div>

                    {resumeInnings === 2 && (
                        <div className="bg-gray-700/30 p-3 rounded-lg border border-gray-600/50">
                             <p className="text-xs text-gray-400 mb-2 font-bold uppercase">Target / 1st Innings ({homeTeam})</p>
                             <div className="grid grid-cols-3 gap-2">
                                <input type="number" value={firstInningsRuns} onChange={(e) => setFirstInningsRuns(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-2 text-white text-center text-xs" placeholder="Runs" />
                                <input type="number" value={firstInningsWickets} onChange={(e) => setFirstInningsWickets(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-2 text-white text-center text-xs" placeholder="Wkts" />
                                <input type="text" value={firstInningsOvers} onChange={(e) => setFirstInningsOvers(e.target.value)} className="bg-gray-900 border border-gray-600 rounded p-2 text-white text-center text-xs" placeholder="Overs" />
                             </div>
                        </div>
                    )}

                    <button type="submit" className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                        Resume Match <RotateCcw size={18} />
                    </button>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;