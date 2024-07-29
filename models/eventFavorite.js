const mongoose = require('mongoose')
let Schema = mongoose.Schema;
const eventFavoriteSchema = new mongoose.Schema({
    userId :{type: mongoose.Schema.Types.ObjectId, ref: "user"},
    eventId :{type: mongoose.Schema.Types.ObjectId, ref: "Event"},
    favourite:{
        type:Number,
        enum:[0,1],   //0 means not favourite 1 means favourite
        default:0
    }
},{
    timestamps:true
});
  
module.exports = mongoose.model("eventFavouriteUser",eventFavoriteSchema)

