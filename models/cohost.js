const mongoose = require('mongoose')
let Schema = mongoose.Schema;
const cohostSchema = new mongoose.Schema({
    user_id :{type: mongoose.Schema.Types.ObjectId, ref: "user"},
    cohost_id :[{type: mongoose.Schema.Types.ObjectId, ref: "user"}],
    event_id :{type: mongoose.Schema.Types.ObjectId, ref: "Event"}
},{
    timestamps:true
});
  
module.exports = mongoose.model("cohost",cohostSchema)

