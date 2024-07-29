const mongoose = require('mongoose')
let Schema = mongoose.Schema;
const faqSchema = new mongoose.Schema({
    question:String,
    answer:String,
},{
    timestamps:true
},{ timestamps: true });
  
module.exports = mongoose.model("faq",faqSchema)

