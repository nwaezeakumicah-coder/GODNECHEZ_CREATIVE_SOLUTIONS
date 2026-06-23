const mongoose = require("mongoose");


const AdminSchema = new mongoose.Schema({


username:{

type:String,

required:true,

unique:true,

trim:true

},



email:{

type:String,

required:true,

unique:true,

lowercase:true,

trim:true

},



password:{

type:String,

required:true

},



role:{

type:String,

default:"admin"

},



approved:{

type:Boolean,

default:false

},




// PASSWORD RESET

otp:{

type:String,

default:null

},



otpExpiry:{

type:Date,

default:null

},



otpVerified:{

type:Boolean,

default:false

},





createdAt:{

type:Date,

default:Date.now

}



});




module.exports = mongoose.model(

"Admin",

AdminSchema

);