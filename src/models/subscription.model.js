import mongoose,{Schema} from "mongoose";

const subscriptionSchema=new Schema({
    subscriber:{  
        type:Schema.Types.ObjectId,  // one who is suscribing
        ref:'User'
    },
    channel:{                // on to who 'suscriber' is suscribing
        type:Schema.Types.ObjectId,
        ref:'User'
    }
},{
    timestamps:true
})

export const Subscriber=mongoose.model('Subscriber',subscriptionSchema);