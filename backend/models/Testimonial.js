const mongoose = require("mongoose");


const TestimonialSchema = new mongoose.Schema({

name:{


type:String,

required:true

},


message:{


type:String,

required:true

},


approved:{


type:Boolean,

default:false

},


createdAt:{


type:Date,

default:Date.now

}


});


module.exports = mongoose.model(
"Testimonial",
TestimonialSchema
);