import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  display_name: String,
  dominant_hand: { type: String, enum: ['Droitier', 'Gaucher', 'Ambidextre'] },
  backhand_type: { type: String, enum: ['Une main', 'Deux mains'] },
  level: { type: String, enum: ['Débutant', 'Intermédiaire', 'Avancé', 'Expert', 'Professionnel'] },
  club: String, ranking: String,
  favorite_surface: { type: String, enum: ['Terre battue', 'Gazon', 'Dur', 'Indoor'] },
  avatar_url: String,
}, { timestamps: true });

export default mongoose.models.PlayerProfile || mongoose.model('PlayerProfile', schema);
