import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middlewares.js";
import { subscribeToChannel } from "../controllers/subscription.controllers.js";

const router = Router();

router.route("/subscribe").post(verifyJWT, subscribeToChannel)


export default router;