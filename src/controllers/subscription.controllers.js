import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.models.js";
import { User } from "../models/user.models.js";

const subscribeToChannel = asyncHandler(async (req, res) => {
    const { subscriberId, channelId } = req.body;

    // Validate request
    if (!subscriberId || !channelId) {
        throw new ApiError(400, "Both subscriberId and channelId are required");
    }

    // Check if both subscriberId and channelId exist
    const users = await User.find({
        _id: {$in: [ subscriberId, channelId ]}
    });

    if (users.length !== 2) {
        throw new ApiError(400, "Invalid subscriberId or channelId");
    }

    // Check if already subscribed
    const existingSubscription = await Subscription.findOne({ 
        subscriber: subscriberId, 
        channel: channelId 
    });

    if (existingSubscription) {
        throw new ApiError(400, "User is already subscribed to this channel");
    }

    // Create new subscription
    const newSubscription = await Subscription.create({
        subscriber: subscriberId,
        channel: channelId
    });

    return res.status(201).json(
        new ApiResponse(201, "User subscribed successfully", newSubscription)
    );
});


export {
    subscribeToChannel
}