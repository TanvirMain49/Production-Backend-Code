import { Router } from "express";
import {getChannelProfile, getCurrentUser, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccount, updateAvatar, updateCoverImage} from "../controllers/user.controllers.js";
import {upload} from "../middleware/multer.middlewares.js";
import { verifyJWT } from "../middleware/auth.middlewares.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ])
    ,registerUser);

router.route("/login").post(loginUser);

// secure routes

//post
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post( refreshAccessToken);

// get
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/channel/:userName").get( verifyJWT, getChannelProfile);
router.route("/watch-history").get( verifyJWT, getWatchHistory);

// patch
router.route("/update-account").patch(verifyJWT, updateAccount);
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);
router.route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage);



// test
// router.get("/watch", verifyJWT, (req, res) => {
//   console.log("Watch history route hit", req.user);
//   res.send("Hit watch history");
// });

export default router;