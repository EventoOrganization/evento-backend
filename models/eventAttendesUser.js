const mongoose = require('mongoose')
let Schema = mongoose.Schema;
const eventAttendesSchema = new mongoose.Schema({
    userId :{type: mongoose.Schema.Types.ObjectId, ref: "user"},
    eventId :{type: mongoose.Schema.Types.ObjectId, ref: "Event"},
    attendEvent:{
        type:Number,
        enum:[0,1],   //0 means not  1 means yes
        default:0
    },
},{
    timestamps:true
});
  
module.exports = mongoose.model("eventAttendesUser",eventAttendesSchema)

