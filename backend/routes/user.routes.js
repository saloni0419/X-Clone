import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  followUnfollowUser,
  getSuggestesUsers,
  getUserProfile,
  updateUser,
} from "../controllers/user.controller.js";

const router = express.Router();

// all these have to be protected routes because after login we will use these routes so authenication check is needed

router.get("/profile/:username", protectRoute, getUserProfile);
router.get("/suggested", protectRoute, getSuggestesUsers),
router.post("/follow/:id", protectRoute, followUnfollowUser);
router.post("/update", protectRoute, updateUser);

export default router;
