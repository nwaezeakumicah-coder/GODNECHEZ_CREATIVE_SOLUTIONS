require("dotenv").config();


const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;
const {CloudinaryStorage} = require("multer-storage-cloudinary");



const Design = require("./models/Design");
const Team = require("./models/Team");
const Admin = require("./models/Admin");
const FAQ = require("./models/FAQ");
const Testimonial = require("./models/Testimonial");
const Message = require("./models/Message");



const app = express();



const PORT = process.env.PORT || 5000;


const SECRET = process.env.JWT_SECRET || "godnechez_secret";




/*
=====================
CLOUDINARY
=====================
*/


cloudinary.config({

cloud_name: process.env.CLOUD_NAME,

api_key: process.env.CLOUD_API_KEY,

api_secret: process.env.CLOUD_API_SECRET

});




const storage = new CloudinaryStorage({

cloudinary: cloudinary,

params: {

folder: "godnechez",

resource_type: "image"

}

});




const upload = multer({

storage: storage,

limits: {

fileSize: 10 * 1024 * 1024

}

});

/*
=====================
EMAIL
=====================
*/


const transporter = nodemailer.createTransport({

service:"gmail",

auth:{

user:process.env.EMAIL_USER,

pass:process.env.EMAIL_PASS

}

});





/*
=====================
MIDDLEWARE
=====================
*/


app.use(cors());


app.use(express.json());


app.use(express.urlencoded({

extended:true

}));







mongoose.connect(process.env.MONGO_URI)

.then(()=>{

console.log("MongoDB Connected");

})

.catch(err=>{

console.log(

"MongoDB Error:",

err.message

);

});








/*
=====================
AUTH CHECK
=====================
*/


function protect(req,res,next){


const header = req.headers.authorization;



if(!header){

return res.status(401).json({

message:"No token"

});

}



const token = header.split(" ")[1];



try{


const decoded = jwt.verify(

token,

SECRET

);


req.admin = decoded;


next();



}

catch(error){


return res.status(401).json({

message:"Invalid token"

});


}


}









app.get("/",(req,res)=>{


res.json({

message:"GODNECHEZ Backend Running"

});


});

/*
=====================
ADMIN SYSTEM
=====================
*/


// LOGIN

app.post(
"/api/admin/login",
async(req,res)=>{


try{


const admin = await Admin.findOne({

username:req.body.username

});



if(!admin){

return res.status(401).json({

message:"Invalid credentials"

});

}




if(!admin.approved){

return res.status(403).json({

message:"Account waiting for approval"

});

}




const match = await bcrypt.compare(

req.body.password,

admin.password

);




if(!match){

return res.status(401).json({

message:"Invalid credentials"

});

}




const token = jwt.sign(

{

id:admin._id,

role:admin.role

},

SECRET,

{

expiresIn:"2h"

}

);





res.json({

success:true,

token

});



}

catch(err){

res.status(500).json({

message:err.message

});

}


}

);











// REGISTER ADMIN


app.post(

"/api/admin/register",

async(req,res)=>{


try{


const totalAdmins = await Admin.countDocuments();



if(totalAdmins >= 3){

return res.status(400).json({

message:"Maximum admin limit reached"

});

}





const exists = await Admin.findOne({

$or:[

{

username:req.body.username

},

{

email:req.body.email

}

]

});





if(exists){

return res.status(400).json({

message:"Admin already exists"

});

}





const password = await bcrypt.hash(

req.body.password,

10

);





const admin = new Admin({

username:req.body.username,

email:req.body.email,

password,

role:"admin",

approved:false

});





await admin.save();





res.json({

success:true,

message:"Registration successful. Await approval"

});



}


catch(err){

res.status(500).json({

message:err.message

});

}


}

);












// PENDING ADMINS


app.get(

"/api/admin/pending",

protect,

async(req,res)=>{


const admins = await Admin.find({

approved:false

});





res.json({

success:true,

data:admins

});


}

);












// APPROVE ADMIN


app.put(

"/api/admin/approve/:id",

protect,

async(req,res)=>{


const admin = await Admin.findByIdAndUpdate(

req.params.id,

{

approved:true

},

{

new:true

}

);





res.json({

success:true,

data:admin

});


}

);











// DELETE ADMIN


app.delete(

"/api/admin/reject/:id",

protect,

async(req,res)=>{


await Admin.findByIdAndDelete(

req.params.id

);





res.json({

success:true

});


}

);













/*
=====================
FORGOT PASSWORD OTP
=====================
*/


app.post(

"/api/admin/forgot-password",

async(req,res)=>{


try{


const admin = await Admin.findOne({

email:req.body.email

});





if(!admin){

return res.status(404).json({

message:"Admin not found"

});

}





const otp = Math.floor(

100000 +

Math.random()*900000

).toString();





admin.otp = otp;


admin.otpExpiry = Date.now()+600000;





await admin.save();








await transporter.sendMail({

from:process.env.EMAIL_USER,

to:admin.email,

subject:"GODNECHEZ Password Reset",

html:

`

<h2>GODNECHEZ ADMIN</h2>

<p>Your OTP:</p>

<h1>${otp}</h1>

<p>Expires in 10 minutes</p>

`

});





res.json({

success:true,

message:"OTP sent"

});



}


catch(err){

res.status(500).json({

message:err.message

});

}


}

);











// VERIFY OTP


app.post(

"/api/admin/verify-otp",

async(req,res)=>{


const admin = await Admin.findOne({

email:req.body.email,

otp:req.body.otp,

otpExpiry:{

$gt:Date.now()

}

});





if(!admin){

return res.status(400).json({

message:"Invalid or expired OTP"

});

}





res.json({

success:true,

message:"OTP verified"

});


}

);












// RESET PASSWORD


app.post(

"/api/admin/reset-password",

async(req,res)=>{


const admin = await Admin.findOne({

email:req.body.email

});





if(!admin){

return res.status(404).json({

message:"Admin not found"

});

}





admin.password = await bcrypt.hash(

req.body.password,

10

);





admin.otp=null;


admin.otpExpiry=null;





await admin.save();





res.json({

success:true,

message:"Password updated"

});


}

);

/*
=====================
STATS
=====================
*/


app.get(

"/api/stats",

protect,

async(req,res)=>{


try{


const designs = await Design.countDocuments();


const team = await Team.countDocuments();



const categories = await Design.distinct(

"category"

);





res.json({

success:true,

designs,

team,

categories:categories.length

});


}

catch(err){

res.status(500).json({

message:err.message

});

}


}

);









/*
=====================
DESIGNS
=====================
*/


// UPLOAD DESIGN


app.post(

"/api/designs",

protect,

upload.single("image"),

async(req,res)=>{


try{


if(!req.file){

return res.status(400).json({

message:"Image required"

});

}





const design = new Design({

title:req.body.title,

category:req.body.category,

description:req.body.description,

image:req.file.path

});





await design.save();





res.json({

success:true,

data:design

});



}

catch(err){

console.log(err);


res.status(500).json({

message:err.message

});

}


}

);











// GET DESIGNS


app.get(

"/api/designs",

async(req,res)=>{


const designs = await Design.find()

.sort({

createdAt:-1

});





res.json({

success:true,

data:designs

});


}

);












// DELETE DESIGN


app.delete(

"/api/designs/:id",

protect,

async(req,res)=>{


try{


await Design.findByIdAndDelete(

req.params.id

);





res.json({

success:true

});


}

catch(err){

res.status(500).json({

message:err.message

});

}


}

);













/*
=====================
TEAM
=====================
*/


// ADD TEAM MEMBER


app.post(

"/api/team",

protect,

upload.single("image"),

async(req,res)=>{


try{


const member = new Team({

name:req.body.name,

position:req.body.position,

category:req.body.category || "staff",

bio:req.body.bio,

image:req.file ? req.file.path : ""

});





await member.save();





res.json({

success:true,

data:member

});


}

catch(err){

res.status(500).json({

message:err.message

});

}


}

);











// GET TEAM


app.get(

"/api/team",

async(req,res)=>{


const team = await Team.find()

.sort({

createdAt:-1

});





res.json({

success:true,

data:team

});


}

);












// UPDATE TEAM MEMBER


app.put(

"/api/team/:id",

protect,

upload.single("image"),

async(req,res)=>{


try{


const update = {


name:req.body.name,

position:req.body.position,

category:req.body.category,

bio:req.body.bio

};





if(req.file){

update.image=req.file.path;

}





const member = await Team.findByIdAndUpdate(

req.params.id,

update,

{

new:true

}

);





res.json({

success:true,

data:member

});


}

catch(err){

res.status(500).json({

message:err.message

});

}


}

);











// DELETE TEAM


app.delete(

"/api/team/:id",

protect,

async(req,res)=>{


try{


await Team.findByIdAndDelete(

req.params.id

);





res.json({

success:true

});


}

catch(err){

res.status(500).json({

message:err.message

});

}


}

);

/*
=====================
FAQ
=====================
*/


// ADD FAQ

app.post(

"/api/faqs",

protect,

async(req,res)=>{


try{


const faq = new FAQ({

question:req.body.question,

answer:req.body.answer

});





await faq.save();





res.json({

success:true,

data:faq

});


}

catch(err){

res.status(500).json({

message:err.message

});

}


}

);









// GET FAQ


app.get(

"/api/faqs",

async(req,res)=>{


const faqs = await FAQ.find()

.sort({

createdAt:-1

});





res.json({

success:true,

data:faqs

});


}

);











// DELETE FAQ


app.delete(

"/api/faqs/:id",

protect,

async(req,res)=>{


try{


await FAQ.findByIdAndDelete(

req.params.id

);





res.json({

success:true

});


}

catch(err){

res.status(500).json({

message:err.message

});

}


}

);















/*
=====================
TESTIMONIALS
=====================
*/


// CLIENT SUBMIT


app.post(

"/api/testimonials",

async(req,res)=>{


try{


const testimonial = new Testimonial({

name:req.body.name,

message:req.body.message

});





await testimonial.save();





res.json({

success:true,

message:"Submitted successfully"

});


}

catch(err){

res.status(500).json({

message:err.message

});

}


}

);












// PUBLIC APPROVED TESTIMONIALS


app.get(

"/api/testimonials",

async(req,res)=>{


const testimonials = await Testimonial.find({

approved:true

})

.sort({

createdAt:-1

});





res.json({

success:true,

data:testimonials

});


}

);












// ADMIN VIEW ALL


app.get(

"/api/testimonials/admin",

protect,

async(req,res)=>{


const testimonials = await Testimonial.find()

.sort({

createdAt:-1

});





res.json({

success:true,

data:testimonials

});


}

);












// APPROVE TESTIMONIAL


app.put(

"/api/testimonials/:id",

protect,

async(req,res)=>{


try{


const testimonial = await Testimonial.findByIdAndUpdate(

req.params.id,

{

approved:req.body.approved

},

{

new:true

}

);





res.json({

success:true,

data:testimonial

});


}

catch(err){

res.status(500).json({

message:err.message

});

}


}

);












// DELETE TESTIMONIAL


app.delete(

"/api/testimonials/:id",

protect,

async(req,res)=>{


try{


await Testimonial.findByIdAndDelete(

req.params.id

);





res.json({

success:true

});


}

catch(err){

res.status(500).json({

message:err.message

});

}


}

);
















/*
=====================
MESSAGES
=====================
*/


// SEND MESSAGE


app.post(

"/api/messages",

async(req,res)=>{


try{


const message = new Message({

name:req.body.name,

email:req.body.email,

subject:req.body.subject,

message:req.body.message

});





await message.save();





res.json({

success:true

});


}

catch(err){

res.status(500).json({

message:err.message

});

}


}

);












// GET MESSAGES


app.get(

"/api/messages",

protect,

async(req,res)=>{


const messages = await Message.find()

.sort({

createdAt:-1

});





res.json({

success:true,

data:messages

});


}

);












// DELETE MESSAGE


app.delete(

"/api/messages/:id",

protect,

async(req,res)=>{


try{


await Message.findByIdAndDelete(

req.params.id

);





res.json({

success:true

});


}

catch(err){

res.status(500).json({

message:err.message

});

}


}

);

/*
=====================
ERROR HANDLING
=====================
*/


app.use((err,req,res,next)=>{


console.log("SERVER ERROR:",err);



res.status(500).json({

success:false,

message:err.message || "Server error"

});


});









/*
=====================
SERVER START
=====================
*/


app.listen(PORT,()=>{


console.log(

`Server running on port ${PORT}`

);


});