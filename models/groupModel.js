const mongoose = require('mongoose')

const groupSchema = mongoose.Schema({
   creator_id:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user'
   },
  groupName:{
    type:String,
   },
  image:{
    type: String,
    default: "userimg.jpeg",
   },
  limit:{
    type:Number,
  }
}
,{
  timestamps:true
 })

const groupModel = mongoose.model('group',groupSchema) ;

module.exports = groupModel