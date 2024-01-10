const mongoose = require("mongoose");
var plm = require("passport-local-mongoose");

const userSchema = mongoose.Schema(
  {
    username: String,
    email: String,
    contact: String,
    about: String,
    image: {
      type: String,
      default: "userimg.jpeg",
    },
  stories: [{ type: mongoose.Schema.Types.ObjectId, ref: "story" }],

    is_online: {
      type: String,
      default: "0",
    },
  },
  {
    timestamps: true,
  }
);

userSchema.plugin(plm);

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
