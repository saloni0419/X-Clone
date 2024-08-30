import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const signup = async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body; // 1- get all the values from user
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // 2- check if email format is valid
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const existingUser = await User.findOne({ username }); // 3. check if username exists or not
    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const existingEmail = await User.findOne({ email }); // 4. check for existing email
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already taken" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be atleast 6 characters long" });
    }

    // 5. hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. create a new user
    const newUser = new User({
      fullName,
      username,
      email,
      password: hashedPassword,
    });

    // 7. generate token and set cookies and save the user in db
    if (newUser) {
      generateTokenAndSetCookie(newUser._id, res);
      await newUser.save();

      res.status(200).json({
        // in res sending the user info back
        _id: newUser._id,
        fullName: newUser.fullName,
        username: newUser.username,
        email: newUser.email,
        followers: newUser.followers,
        following: newUser.following,
        profileImg: newUser.profileImg,
        coverImg: newUser.coverImg,
      });
    } else {
      res.status(400).json({ error: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller : ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body; // 1- get username and password for login
    const user = await User.findOne({ username }); // 2- find the username in db

    if (!user) {
      return res.status(400).json({ error: "Invalid username" }); //3- Return error if user is not found.
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password); // 4- check the password enterd with password in db

    if (!isPasswordCorrect) {
      return res.status(400).json({ error: "Invalid password" }); //5-  Return error if the password is incorrect.
    }

    // 5- // If both username and password are correct, generate the token and set the cookie.
    generateTokenAndSetCookie(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      followers: user.followers,
      following: user.following,
      profileImg: user.profileImg,
      coverImg: user.coverImg,
    });
  } catch (error) {
    console.log("Error in login controller : ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {
    // Clear the JWT cookie by setting it to an empty string and setting its maxAge to 0.
    // This effectively deletes the cookie from the client's browser.
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully " });
  } catch (error) {
    console.log("Error in logout controller : ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller to get the authenticated user's details
export const getMe = async (req, res) => {
  try {
    // 1. Find the user by their ID (from the request object set by the protectRoute middleware)
    const user = await User.findById(req.user._id).select("-password");
    res.status(200).json(user);
  } catch (error) {
    console.log("Error in getMe controller : ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
