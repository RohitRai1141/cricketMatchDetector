import React, { useState } from 'react';
import { Trophy, Users, Clock, Shield } from 'lucide-react';
import { INITIAL_MATCH_STATE } from '../constants';
import { MatchState } from '../types';

interface SetupScreenProps {
  onStart: (config: Partial<MatchState>) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onStart }) => {
  const [overs, setOvers] = useState(INITIAL_MATCH_STATE.totalOvers);
  const [players, setPlayers] = useState(INITIAL_MATCH_STATE.playersPerTeam);
  const [homeTeam, setHomeTeam] = useState('Home Team');
  const [awayTeam, setAwayTeam] = useState('Away Team');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({
      totalOvers: overs,
      playersPerTeam: players,
      homeTeamName: homeTeam,
      awayTeamName: awayTeam,
      battingTeam: homeTeam, // Home team bats first by default
      bowlingTeam: awayTeam
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-900 overflow-y-auto">
      <div className="w-full max-w-md my-auto">
        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <Trophy size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Cricket Tracker</h1>
            <p className="text-gray-400">Two-Innings Match Setup</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
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
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
              <label className="text-emerald-400 text-xs uppercase font-bold mb-2 block">
                 Home Team (Batting 1st)
              </label>
              <input
                type="text"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                placeholder="e.g. Super Kings"
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
          </div>

          <div>
              <label className="text-red-400 text-xs uppercase font-bold mb-2 block">
                 Away Team (Bowling 1st)
              </label>
              <input
                type="text"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                placeholder="e.g. Royal Challengers"
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-red-500 outline-none"
              />
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-600/30 active:scale-95"
          >
            Start Match
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupScreen;