import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  match_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  set_number: Number, game_number: Number,
  point_winner: { type: String, enum: ['player', 'opponent'], required: true },
  shot_type: { type: String, enum: ['Ace', 'Service gagnant', 'Coup droit', 'Revers', 'Volée', 'Smash', 'Amortie', 'Lob', 'Passing', 'Faute directe', 'Double faute'] },
  shot_direction: { type: String, enum: ['Droite', 'Centre', 'Gauche', 'Long de ligne', 'Croisé'] },
  is_winner: Boolean, is_unforced_error: Boolean,
  score_at_point: String, timestamp: String,
}, { timestamps: true });

export default mongoose.models.PointLog || mongoose.model('PointLog', schema);
