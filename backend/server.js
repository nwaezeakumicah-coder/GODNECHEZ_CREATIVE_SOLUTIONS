require("dotenv").config();


const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");



const Design = require("./models/Design");
const Team = require("./models/Team");
const Admin = require("./models/Admin");
const FAQ = require("./models/FAQ");
const Testimonial = require("./models/Testimonial");



const app = express();


const PORT = process.env.PORT || 5000;


const SECRET = process.env.JWT_SECRET || "godnechez_secure_key";





app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
extended:true
}));






const uploadFolder = path.join(
__dirname,
"uploads"
);



if(!fs.existsSync(uploadFolder)){

fs.mkdirSync(uploadFolder);

}



app.use(
"/uploads",
express.static(uploadFolder)
);







mongoose.connect(process.env.MONGO_URI)

.then(()=>{

console.log("MongoDB Connected");

})

.catch(err=>{

console.log(err.message);

});









const storage = multer.diskStorage({

destination:(req,file,cb)=>{

cb(null,uploadFolder);

},


filename:(req,file,cb)=>{

cb(
null,
Date.now()+path.extname(file.originalname)
);

}

});





const upload = multer({

storage

});









function protect(req,res,next){


const header=req.headers.authorization;


if(!header){

return res.status(401).json({

message:"Access denied"

});

}



const token=header.split(" ")[1];



try{


jwt.verify(token,SECRET);


next();


}

catch(err){

res.status(401).json({

message:"Invalid token"

});

}


}








app.get("/",(req,res)=>{


res.json({

message:"GODNECHEZ Backend Running"

});


});






/* ADMIN LOGIN */


app.post(
"/api/admin/login",
async(req,res)=>{


const admin = await Admin.findOne({

username:req.body.username

});



if(!admin){

return res.status(401).json({

message:"Invalid credentials"

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

id:admin._id

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

);






/* STATS */


app.get(
"/api/stats",
protect,
async(req,res)=>{


const designs = await Design.countDocuments();


const team = await Team.countDocuments();



const categories = await Design.distinct(
"category"
);



res.json({

designs,

team,

categories:categories.length

});


}

);
/* =====================
   DESIGNS
===================== */


app.post(
"/api/designs",
protect,
upload.single("image"),
async(req,res)=>{


try{


const design=new Design({

title:req.body.title,

category:req.body.category,

description:req.body.description,

image:req.file.filename

});


await design.save();



res.json({

success:true,

data:design

});


}

catch(err){

res.status(500).json({

message:err.message

});

}


}

);







app.get(
"/api/designs",
async(req,res)=>{


const designs=await Design.find()

.sort({

createdAt:-1

});



res.json({

success:true,

data:designs

});


}

);







app.delete(
"/api/designs/:id",
protect,
async(req,res)=>{


const design=await Design.findById(

req.params.id

);



if(!design){

return res.status(404).json({

message:"Not found"

});

}




const file=path.join(

uploadFolder,

design.image

);



if(fs.existsSync(file)){

fs.unlinkSync(file);

}



await Design.findByIdAndDelete(

req.params.id

);



res.json({

success:true

});


}

);









/* =====================
   TEAM
===================== */



app.post(
"/api/team",
protect,
upload.single("image"),
async(req,res)=>{


try{


const member=new Team({

name:req.body.name,

position:req.body.position,

category:req.body.category || "staff",

bio:req.body.bio,

image:req.file.filename

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







app.get(
"/api/team",
async(req,res)=>{


const team=await Team.find()

.sort({

createdAt:-1

});



res.json({

success:true,

data:team

});


}

);







app.put(
"/api/team/:id",
protect,
upload.single("image"),
async(req,res)=>{


const update={


name:req.body.name,

position:req.body.position,

category:req.body.category,

bio:req.body.bio


};



if(req.file){

update.image=req.file.filename;

}



const member=await Team.findByIdAndUpdate(

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

);








app.delete(
"/api/team/:id",
protect,
async(req,res)=>{


await Team.findByIdAndDelete(

req.params.id

);



res.json({

success:true

});


}

);








/* =====================
   FAQ
===================== */



app.post(
"/api/faqs",
protect,
async(req,res)=>{


const faq=new FAQ({

question:req.body.question,

answer:req.body.answer

});



await faq.save();



res.json({

success:true,

data:faq

});


}

);







app.get(
"/api/faqs",
async(req,res)=>{


const faqs=await FAQ.find()

.sort({

createdAt:-1

});



res.json({

success:true,

data:faqs

});


}

);







app.delete(
"/api/faqs/:id",
protect,
async(req,res)=>{


await FAQ.findByIdAndDelete(

req.params.id

);



res.json({

success:true

});


}

);
/* =====================
   TESTIMONIALS
===================== */



// CLIENT SUBMIT TESTIMONIAL

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








// PUBLIC DISPLAY APPROVED ONLY


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








// APPROVE


app.put(
"/api/testimonials/:id",
protect,
async(req,res)=>{


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

);









// DELETE


app.delete(
"/api/testimonials/:id",
protect,
async(req,res)=>{


await Testimonial.findByIdAndDelete(

req.params.id

);



res.json({

success:true

});


}

);










/* =====================
   MESSAGES
===================== */


const Message = require("./models/Message");



app.post(
"/api/messages",
async(req,res)=>{


const message=new Message({

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

);








app.get(
"/api/messages",
protect,
async(req,res)=>{


const messages=await Message.find()

.sort({

createdAt:-1

});



res.json({

success:true,

data:messages

});


}

);








app.delete(
"/api/messages/:id",
protect,
async(req,res)=>{


await Message.findByIdAndDelete(

req.params.id

);



res.json({

success:true

});


}

);










/* =====================
   SERVER
===================== */


app.listen(PORT,()=>{


console.log(

`Server running on port ${PORT}`

);


});