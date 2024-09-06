import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

import { v2 as cloudinary } from "cloudinary";

export const createPost = async (req, res) => {
  try {
    const { text } = req.body; // for creating post text and maybe image is needed
    let { img } = req.body;
    const userId = req.user._id.toString();

    const user = await User.findById(userId); // check if user exists or not
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!text && !img) {
      // check for post is not created without these content , to prevent empty post from being created
      return res.status(400).json({ error: "Post must have text or image" });
    }

    // if there is image post it on cloudinary
    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      img = uploadedResponse.secure_url;
    }

    const newPost = new Post({
      user: userId,
      text,
      img,
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in createPost controller : ", error);
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id); // find the post of the id
    if (!post) {
      // if not post founf return error
      return res.status(404).json({ error: "Post not found" });
    }

    // check if we are owner of the post
    if (post.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this post" });
    }

    // if post had image then delete it from the cloudinary account
    if (post.img) {
      const imgId = post.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    // now delete post from the db
    await Post.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.log("Error in deletePost controller : ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const { text } = req.body; // comment to do
    const postId = req.params.id; // post id on which comment is to be done
    const userId = req.user._id; // id of the user doing the comment

    if (!text) {
      // required to put text for comment
      return res.status(400).json({ error: "Text field is required" });
    }

    // check post is in db or not
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = { user: userId, text }; // creating new comment object with userId and text
    post.comments.push(comment); // pust the comment in the comments array of post
    await post.save(); // save it in db
    res.status(200).json(post);
  } catch (error) {
    console.log("Error in commentOnPost controller : ", error);
    res.status(500).json({ error: "Internal server errro" });
  }
};

export const likeUnlikePost = async (req, res) => {
  try {
    const userId = req.user._id; /// id of user
    const { id: postId } = req.params; // renamed the id of post to postId

    const post = await Post.findById(postId); //get the post from db

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // check if user liked this post already
    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      // if post is liked then unlike the post
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } }); // update the likedpost in user model
      res.status(200).json({ message: "Post unliked successfully" });
    } else {
      // else like the post and send the notification
      post.likes.push(userId);
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } }); // updating likedpost of user model
      await post.save(); // save in the db

      // creating notification
      const notification = new Notification({
        from: userId,
        to: post.user,
        type: "like",
      });

      await notification.save();

      res.status(200).json({ message: "Post liked successfully" });
    }
  } catch (error) {
    console.log("Error in likeUnlikePost controller : ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Logic of like-unlike post
 * there is user john[userid:1] , there is post[postid:2]
 * john likes the post, then add the id of john in the likes array [1] (push method)
 * john unlikes the post, then remove the id of john fromt the like array (pull method)
 * when post is liked send the notification to the creater of the post [john has liked your post]
 */

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });
    // -1  gives lastes post on top
    // populate is a method to get other user detail like username profile image

    if (posts.length === 0) {
      return res.status(200).json([]); // returning the empty array
    }

    res.status(200).json(posts);
  } catch (error) {
    console.log("Error in getAllPosts controller : ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// get all the liked post by the user
export const getLikedPosts = async (req, res) => {
  const userId = req.params.id; // get user id

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // get all posts that this user has liked
    // Find all documents in the Post collection where the _id field matches any of the values in the user.likedPosts array.
    const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json(likedPosts);
  } catch (error) {
    console.log("Error in getLikedPosts controller : ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// post of all the user we follow
export const getFollowingPosts = async (req, res) => {
  try {
    const userId = req.user._id; // userId of currently authenticated user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // get the following array of the user
    const following = user.following;

    const feedPosts = await Post.find({ user: { $in: following } })
      .sort({
        createdAt: -1,
      })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json(feedPosts);
  } catch (error) {
    console.log("Error in getFollowingPosts controller : ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// get all posts of a single user
export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params

    const user = await User.findOne({username})
    if(!user){
      return res.status(404).json({error : "User not found"})
    }

    const posts = await Post.find({user : user._id}).sort({createdAt : -1}).populate({
      path : "user",
      select : "-password"
    }).populate({
      path : "comments.user",
      select : "-password"
    })

    res.status(200).json(posts)
  } catch (error) {
    console.log("Error in getUserController : ", error);
    res.status(500).json({error : "Internal server error"})
  }
};
