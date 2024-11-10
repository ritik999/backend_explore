import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const getAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};

const registerUser = async (req, res) => {
  const { fullname, email, username, password } = req.body;

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath=req.files?.coverImage[0]?.path;   // throwing error of undefine

  // fixing undefine error
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) throw ApiError(400, "Avatar file is required");

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) throw ApiError(400, "Avatar file is required");

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const userCreated = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!userCreated) {
    throw new ApiError(500, "Something went wrong while registering the user");
  } else {
    res.status(201).json({ success: true, user: userCreated });
  }

  res.status(200).json({
    success: true,
    message: "ok",
  });
};

const loginUser = async (req, res) => {
  const { username, email, password } = req.body;

  // (!username || !email) better alternative for it is (!(email || username))
  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await getAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id);

  const option = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json({
      success: true,
      user: loggedInUser,
      accessToken,
      refreshToken,
      message: "user is successfully logged-in",
    });
};

const logoutUser = async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const option = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json({ success: true, message: "user logged out" });
};

const regenerateAccessToken = async (req, res) => {
  const { getRefreshToken } = req.cookies || req.body; // req.body for mobile app

  if (!getRefreshToken) {
    throw new ApiError(401, "pls re-login");
  }

  try {
    const decodedToken = jwt.verify(
      getRefreshToken,
      process.env.REFRESH_KEY_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(404, "Invalid refresh token");
    }

    if (user?.refreshToken !== getRefreshToken) {
      throw new ApiError(404, "Invalid refresh token");
    }

    const { accessToken, refreshToken } = await getAccessAndRefreshToken(
      user._id
    );

    const option = {
        httpOnly: true,
        secure: true,
      };

    res
      .status(200)
      .cookie("AccessToken", accessToken,option)
      .cookie("RefreshToken", refreshToken,option)
      .json({ success: true, message: "access token refreshed" });
  } catch (error) {
    throw new ApiError(404, "Invalid refresh token");
  }
};

const changeCurrentPassowrd=async(req,res)=>{
    const {oldPassword,newPassword}=req.body;
    const user=await User.findById(req.user?._id);

    const isPasswordCorrect=user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400,'Invalid old password');
    }

    user.password=newPassword;
    user.save({validateBeforeSave:false});

    return res.status(200).json({success:true,message:'password changed successfully'});
}

const getCurrentUser=async(req,res)=>{
    return res.status(200).json({success:true,user:req.user});
}

const updateAccountDetail=async(req,res)=>{
    const {fullname,email}= req.body;

    if(!fullname || !email){
        throw new ApiError(400,'All fields are required');
    }

    const user=await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            fullname,
            email
        }
    },{
        new:true
    }).select('-password');

    return res.status(200).json({success:true,message:'Account detail updated successfully'})
}

const updateUserAvatar=async(req,res)=>{
    const avatarLocalPath=req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,'Avatar file is missing');
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400,'error while uploading avatar')
    }

    const user=await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            avatar
        }
    },{
        new:true
    }).select('-password')

    return res.status(200).json({success:true,message:"avatar updated successfully"});
}

const updateUserCoverImage=async(req,res)=>{
    const coverImageLocalPath=req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,'CoverImage file is missing');
    }

    const coverImage=await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400,'error while uploading coverImage')
    }

    const user=await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            coverImage
        }
    },{
        new:true
    }).select('-password')

    return res.status(200).json({success:true,message:"coverImage updated successfully"});
}

export { registerUser, loginUser, logoutUser, regenerateAccessToken, changeCurrentPassowrd, getCurrentUser, updateAccountDetail, updateUserAvatar, updateUserCoverImage };
