import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
  sets_player: [Number], sets_opponent: [Number],
  current_game_player: String, current_game_opponent: String,
  current_set: Number, serving: String,
  config: { type: mongoose.Schema.Types.Mixed },
  is_super_tiebreak_set: Boolean,
}, { _id: false });

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  player_first_name: String, player_last_name: String, player_name: String,
  opponent_first_name: String, opponent_last_name: String, opponent_name: String,
  surface: { type: String, enum: ['Terre-battue', 'Quick', 'Green Set', 'Terbal'] },
  match_type: { type: String, default: 'Simple' },
  sets_to_win: { type: Number, default: 2 },
  games_per_set: { type: Number, default: 6 },
  advantage: { type: Boolean, default: true },
  tiebreak: { type: Boolean, default: true },
  tiebreak_points: { type: Number, default: 7 },
  super_tiebreak: { type: Boolean, default: false },
  super_tiebreak_points: { type: Number, default: 10 },
  status: { type: String, enum: ['En cours', 'Terminé', 'Abandonné'], default: 'En cours' },
  score: scoreSchema, winner: String, duration_minutes: Number,
  date: String, is_streaming: Boolean, notes: String,
}, { timestamps: true });

export default mongoose.models.Match || mongoose.model('Match', schema);
