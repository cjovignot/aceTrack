import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    match_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
    },

    set_number: Number,
    game_number: Number,

    point_winner: {
      type: String,
      enum: ["player", "opponent"],
      required: true,
    },

    shot_type: {
      type: String,
      enum: ["ace", "winner", "unforced_error", "double_fault"],
      required: true,
    },
    client_id: String, // 🔥 IMPORTANT (sync queue)

    shot_direction: String,

    is_winner: { type: Boolean, default: false },
    is_unforced_error: { type: Boolean, default: false },

    score_at_point: String,
    timestamp: String,
  },
      is_deleted: { type: Boolean, default: false }, // 🔥 FIX
  { timestamps: true },
);

export default mongoose.models.PointLog ||
  mongoose.model("PointLog", schema);