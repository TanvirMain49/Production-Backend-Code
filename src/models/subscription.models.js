import mongoose from "mongoose";

const subscriptionsSchema = new mongoose.Schema({
    subscriber:{
        type: mongoose.Schema.Types.ObjectId,   // one who is subscribing
        ref:"User"
    },
    channel:{
        type: mongoose.Schema.Types.ObjectId,   // one who create the channel
        ref:"User"
    }
}, {timestamps:true});

export const Subscription = mongoose.model("Subscription", subscriptionsSchema);