import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

export const getUserProfile = async (req, res) => {
  const { username } = req.params; // 1- get username from params

  try {
    const user = await User.findOne({ username }).select("-password"); // 2- find the user
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user); // 3- returning the user
  } catch (error) {
    console.log("Error in getUserProfile : ", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const followUnfollowUser = async (req, res) => {
  try {
    const { id } = req.params; // 1 : This is the ID of the user to follow or unfollow.

    const userToModify = await User.findById(id); // 2: Find the user you want to follow/unfollow

    const currentUser = await User.findById(req.user._id); // 3: Find the current user (the one making the request)

    if (id === req.user._id.toString()) {
      // 4: Check if the user is trying to follow/unfollow themselves.
      return res
        .status(400)
        .json({ message: "You can't follow or unfollow yourself" });
    }

    if (!userToModify || !currentUser) {
      return res.status(400).json({ error: "User not found" });
    }

    const isFollowing = currentUser.following.includes(id); // 5 : Check if the current user is already following the user to modify.

    if (isFollowing) {
      // 6: If the current user is already following, unfollow the user.

      await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } }); // Remove the current user's ID from the followers array of the user to modify.

      await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } }); // Remove the user to modify's ID from the following array of the current user.

      // todo return the id of the user as response

      res.status(200).json({ message: "User unfollowed successfully" });
    } else {
      // 7: If the current user is not already following, follow the user.

      await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } }); // Add the current user's ID to the followers array of the user to modify.

      await User.findByIdAndUpdate(req.user._id, { $push: { following: id } }); // Add the user to modify's ID to the following array of the current user.

      // send notification to the user
      const newNotification = new Notification({
        type: "follow",
        from: req.user._id,
        to: userToModify._id,
      });

      await newNotification.save();

      // todo return the id of user as response
      res.status(200).json({ message: "User followed successfully" });
    }
  } catch (error) {
    console.log("Error in followUnfollowUser: ", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getSuggestesUsers = async (req, res) => {
  try {
    // 1. exclude current user from list of suggested user and users that we already follow
    const userId = req.user._id;

    const userFollowedByMe = await User.findById(userId).select("following");

    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId }, // not equal to user Id
        },
      },
      { $sample: { size: 10 } }, //  10 different user and not the authenticated user
    ]);

    // filter some user out of these
    const filteredUsers = users.filter(
      (user) => !userFollowedByMe.following.includes(user._id)
    ); //  create a new array called by removing users that are already followed by the current user.

    const suggestedUsers = filteredUsers.slice(0, 4); // get only 4 different users

    suggestedUsers.forEach((user) => (user.password = null));

    res.status(200).json(suggestedUsers);
  } catch (error) {
    console.log("Error in suggested users : ", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req, res) => {
  // user is going to update their profile so they have to pass some value
  const { fullName, email, username, currentPassword, newPassword, bio, link } =
    req.body;

  // to update the profile image and cover image
  let { profileImg, coverImg } = req.body;

  const userId = req.user._id; // get id of current user

  try {
    let user = await User.findById(userId); // check user exists or not
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      (!newPassword && currentPassword) ||
      (!currentPassword && newPassword)
    ) {
      return res.status(400).json({
        error: "Please provide both current password and new password",
      });
    }

    // if current password and new password are there then we will update
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters long" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // profile image and cover image update
    // if profile image is there then delete it and upload the new one
    if (profileImg) {
      if (user.profileImg) {
        /* https://res.cloudinary.com/dyfqon1v6/image/upload/v1712997552/zmxorcxexpdbh8r0bkjb.png
        It is a concise way to extract the public ID from a Cloudinary image URL by:

        Splitting the URL into segments using / and taking the last segment (the filename).
        Splitting the filename by . to separate the public ID from the file extension.
        Selecting the first part, which is the public ID.
        
        */
        await cloudinary.uploader.destroy(
          user.profileImg.split("/").pop().split(".")[0]
        );
      }

      const uploadedResponse = await cloudinary.uploader.upload(profileImg);
      profileImg = uploadedResponse.secure_url;
    }

    if (coverImg) {
      if (user.coverImg) {
        await cloudinary.uploader.destroy(
          user.coverImg.split("/").pop().split(".")[0]
        );
      }

      const uploadedResponse = await cloudinary.uploader.upload(coverImg);
      coverImg = uploadedResponse.secure_url;
    }

    user.fullName = fullName || user.fullName; // either update it or keep the same as it is in db
    user.email = email || user.email;
    user.username = username || user.username;
    user.bio = bio || user.bio;
    user.link = link || user.link;
    user.profileImg = profileImg || user.profileImg;
    user.coverImg = coverImg || user.coverImg;

    user = await user.save();

    user.password = null; // not updating password in the db

    return res.status(200).json(user);
  } catch (error) {
    console.log("Error in updateUser : ", error.message);
    res.status(500).json({ error: error.message });
  }
};
