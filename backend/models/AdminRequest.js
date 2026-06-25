const mongoose = require("mongoose");

const AdminRequestSchema = new mongoose.Schema({

username:{
type:String,
required:true,
unique:true
},

email:{
type:String,
required:true,
unique:true
},

password:{
type:String,
required:true
},

role:{
type:String,
default:"admin"
},

status:{
type:String,
enum:["pending","approved","rejected"],
default:"pending"
},

createdAt:{
type:Date,
default:Date.now
}

});

module.exports = mongoose.model(
"AdminRequest",
AdminRequestSchema
);