import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessTokenAndRefreshToken = async (UserId) => {
  try {
    const user = await User.findById(UserId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token."
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //GET DATA FROM FRONTEND
  const { userName, email, fullName, password } = req.body;

  // Check if there is any empty field (new method some())
  if (
    [userName, email, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required.");
  }

  // Check if user already exist or not ( new thing to learn is $ with or )
  const existedUser = await User.findOne({
    $or: [{ email }, { userName: userName.toLowerCase() }],
  });
  if (existedUser) {
    throw new ApiError(400, "User with this email or username already exists.");
  }

  // get the file or image and upload into cloudinary
  const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar Local Path Not Found!!.");
  }

  //->uploading image in the cloudinary
  const avatar = await uploadCloudinary(avatarLocalPath);
  const coverImage = await uploadCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar Image not found.");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    userName: userName.toLowerCase(),
    email,
    password,
  });

  // remove the password and refreshToken and cheek
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(
      400,
      "Something went wrong while registering user account."
    );
  }

  return res
    .status(201)
    .json(new ApiResponse(200, "User created successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  /* 
        1. req.body->data
        2. username or email
        3. find the user
        4. cheek the password
        5. access and refresh token
        6. send cookies
    */

  const { email, userName, password } = req.body;

  // console.log(email, userName, password);

  if (!userName && !email) {
    throw new ApiError(400, "Required userName or email.");
  }

  const user = await User.findOne({
    $or: [{ userName: userName.toLowerCase() }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist.");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credential.");
  }

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findByIdAndUpdate(
    userId,
    {
      /*It literally sets the field value to undefined in the document, 
            but MongoDB does not store undefined → it keeps the old value. 

            Code:
            $set: { refreshToken: undefined }*/

      //This tells MongoDB to delete that field, not "set it to undefined".
      $unset: { refreshToken: 1 },
    },
    {
      new: true,
    }
  );

  console.log("User: ", user);

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookie?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access.");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refreshToken.");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired.");
    }

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    };

    const { accessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshToken(user?._id);

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token.");
  }
});

const changePassword = asyncHandler(async (req, res)=>{
    const {oldPassword, newPassword} = req.body;

    if(!oldPassword || !newPassword){
        throw new ApiError(400, "Both password fields are required.");
    }

    const user = await User.findById(req.user?._id);

    if(!user){
        throw new ApiError(401, "User not found.");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400, "You have entered the wrong password.");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password has been changed"));

});

const getCurrentUser = asyncHandler(asyncHandler( async (req, res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"))

}))

const updateAccount = asyncHandler(async (req, res) => {
    const { email, fullName } = req.body;

    if (!email || !fullName) {
    throw new ApiError(400, "At least one of email or fullName is required.");
    }

    const user= await User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set: {
                email,
                fullName
            }
        },
        {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details successfully"))
});

const updateAvatar = asyncHandler(async(req, res)=>{
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file missing.");
    }

    const avatar = await uploadCloudinary(avatarLocalPath);

    if(!avatar?.url){
        throw new ApiError(400, "Error while uploading avatar.");
    }

    // TODO: delete old photo from cloudinary

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id ,
        {
            $set:{
                avatar: avatar?.url
            }
        },
        {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async(req, res)=>{
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image file missing.");
    }

    const coverImage = await uploadCloudinary(coverImageLocalPath);

    if(!coverImage?.url){
        throw new ApiError(400, "Error while uploading cover image.")
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id ,
        {
            $set:{
                coverImage: coverImage?.url
            }
        },
        {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Cover image updated successfully"));
});

const getChannelProfile = asyncHandler(async(req, res)=>{
  const {userName} = req.params;

  if(!userName || !userName.trim()){
    throw new ApiError(400, "User name is required");
  }

  const channel = await User.aggregate([
  {
    // Match user by username (case-insensitive)
    // Similar to: User.findOne({ userName: userName.toLowerCase() })
    $match: {
      userName: userName.toLowerCase()
    }
  },
  {
    // Join subscriptions where this user is the CHANNEL
    // Fetch users who subscribed to this channel
    $lookup: {
      from: "subscriptions",
      localField: "_id",
      foreignField: "channel",
      as: "subscribers"
    }
  },
  {
    // Join subscriptions where this user is the SUBSCRIBER
    // Fetch channels this user has subscribed to
    $lookup: {
      from: "subscriptions",
      localField: "_id",
      foreignField: "subscriber",
      as: "subscribedTo"
    }
  },
  {
    // Add computed fields for counts and current user status
    $addFields: {
      SubscriberCount: {
        // Total number of subscribers
        $size: "$subscribers"
      },
      SubscriptedToCount: {
        // Total number of channels this user subscribed to
        $size: "$subscribedTo"
      },
      isSubscripted: {
        // Check if logged-in user is subscribed to this channel
        $cond: {
          if: { $in: [req.user?._id, "$subscribers.subscriber"] },
          then: true,
          else: false
        }
      }
    }
  },
  {
    // Select only required fields for response
    $project: {
      userName: 1,
      email: 1,
      fullName: 1,
      avatar: 1,
      coverImage: 1,
      SubscriberCount: 1,
      SubscriptedToCount: 1,
      isSubscripted: 1
    }
  }
]);

  if(!channel?.length){
    throw new ApiError(404, "Channel dose not exist");
  }

  return res
  .status(200)
  .json(new ApiResponse(200, "User channel fetched successfully", channel[0]))

});

const getWatchHistory = asyncHandler(async(req, res)=>{
  
  const user = await User.aggregate([
    {
      $match: { 
        _id: new mongoose.Types.ObjectId(req.user?._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as:"watchHistory",
        pipeline:[
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline:[
                {
                  $project: {
                    fullName: 1,
                    avatar: 1,
                    userName: 1,
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner:{
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ])

  console.log(user[0]);


  if(!user?.length){
    throw new ApiError(400, "User dose not exists!")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200,"Watch history fetch successfully", user[0].watchHistory)
  );
})

export { 
    registerUser,
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changePassword, 
    getCurrentUser, 
    updateAccount,
    updateAvatar,
    updateCoverImage,
    getChannelProfile,
    getWatchHistory
};
