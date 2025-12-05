import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {User} from "../models/user.models.js";
import { uploadCloudinary } from "../utils/cloudinary.js";


const generateAccessTokenAndRefreshToken = async(UserId) =>{
    try {
        const user = await User.findById(UserId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token.");
    }
}



const registerUser = asyncHandler(async (req, res) => {
    //GET DATA FROM FRONTEND
    const { userName, email, fullName, password } = req.body;

    // Check if there is any empty field (new method some())
    if ( [userName, email, fullName, password].some((field) => field?.trim() === "") ){
        throw new ApiError(400, "All fields are required");
    }

    // Check if user already exist or not ( new thing to learn is $ with or )
    const existedUser = await User.findOne({
        $or: [{ email }, { userName: userName.toLowerCase() }]
    });
    if (existedUser) {
        throw new ApiError(400, "User with this email or username already exists");
    }

    // get the file or image and upload into cloudinary
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar Local Path Not Found!!");
    }

    //->uploading image in the cloudinary
    const avatar = await uploadCloudinary(avatarLocalPath);
    const coverImage = await uploadCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar Image not found");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        userName: userName.toLowerCase(),
        email,
        password,
    })

    // remove the password and refreshToken and cheek
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(400, "Something went wrong while registering user account");
    }

    return res.status(201).json(
        new ApiResponse(200,"User created successfully", createdUser)
    )
});

const loginUser = asyncHandler(async (req, res)=>{
    /* 
        1. req.body->data
        2. username or email
        3. find the user
        4. cheek the password
        5. access and refresh token
        6. send cookies
    */

    const {email, userName, password} = req.body;
    if(!userName || !email){
        throw new ApiError(400, "required userName or email")
    }

    const user = await User.findOne({
        $or:[{userName}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User dose not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credential");
    }

    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "strict"
    }


    res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User Logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req, res)=>{
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, 
        {
            $set: { refreshToken: undefined }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "strict"
    }

    res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json( new ApiResponse(200, {}, "User logged out successfully!") )
})

export { registerUser, loginUser, logoutUser };
