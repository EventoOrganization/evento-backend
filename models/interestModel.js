const mongoose=require('mongoose');
const interestSchema=new mongoose.Schema({
    name:String,
    image:String
},{ timestamps: true })
const interest=mongoose.model('interest',interestSchema);
module.exports=interest;