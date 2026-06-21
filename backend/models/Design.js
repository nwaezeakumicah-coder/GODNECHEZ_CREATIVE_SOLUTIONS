const mongoose = require("mongoose");


const designSchema = new mongoose.Schema({


title:{


type:String,

required:true


},



category:{


type:String,

required:true,

lowercase:false


},




description:{


type:String


},




image:{


type:String,

required:true


},




createdAt:{


type:Date,

default:Date.now


}



});



module.exports = mongoose.model(
"Design",
designSchema
);