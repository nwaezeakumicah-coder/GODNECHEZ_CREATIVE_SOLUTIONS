const mongoose = require("mongoose");


const teamSchema = new mongoose.Schema({


name:{

type:String,

required:true

},



position:{

type:String,

required:true

},



category:{

type:String,

required:true,

default:"staff"

},



bio:{

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
"Team",
teamSchema
);