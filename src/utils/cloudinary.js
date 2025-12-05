import { v2 as cloudinary } from 'cloudinary'
import fs from "fs";


cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadCloudinary = async (localFilePath)=>{
  try {

    if(!localFilePath) return null;

    //upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto"
    })
    fs.unlinkSync(localFilePath); //careful there is unlink and another is unlinkSync
    return response;

  } catch (error) {
    fs.unlinkSync(localFilePath)  //remove the local save temporary file as uploaded operation got failed
    return null;
  }
}

export {uploadCloudinary};