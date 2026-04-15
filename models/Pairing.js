import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    match_id: { type: mongoose.Schema.Types.ObjectId, ref: "Match" },
    connected: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.models.Pairing || mongoose.model("Pairing", schema);
