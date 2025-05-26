const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    message: { type: String, required: true },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Feedback",
      default: null,
    }, // reference to parent message
    reply: { type: String, default: null }, // stores the reply message (if any)
    status: { type: String, enum: ["pending", "replied"], default: "pending" },
    repliedAt: { type: Date, default: null }, // when the admin replied
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Feedback = mongoose.model("Feedback", feedbackSchema);
module.exports = Feedback;
