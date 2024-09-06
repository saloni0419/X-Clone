import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      require: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minLength: 6,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    // user will have followers which will be type of array
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId, // it has objectid
        ref: "User", // refer to user model => because a follower is user
        default: [], // because when user signs up it has 0 followers
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    profileImg: {
      type: String,
      default: "", // becuase profile picture can be optional so by default empty string
    },
    coverImg: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    link: {
      type: String,
      default: "",
    },
    likedPosts: [
      // each post will be refrence to the post model
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        default: [], // by default user will not have any liked posts
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
