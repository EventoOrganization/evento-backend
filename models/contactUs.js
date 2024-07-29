const mongoose=require('mongoose');
const contactUsSchema=new mongoose.Schema({
    name:String,
    email:String,
    phoneNumber:String,
    message:String
},{
    timestamps:true
})
const contactUs=mongoose.model('contactUs',contactUsSchema);
module.exports=contactUs;