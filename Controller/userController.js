const userModel = require('../Model/userModel');
const plandOrderModel = require('../Model/plandOrderModel');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const moment = require('moment');


exports.onlineUser = asyncHandler(async (req, res) => {
    const { name, phone, password, height, weight, dateOfBirth, blood, email, modeOfPayment, planId, planName, amount, duration, address} = req.body; 
    const image = req.files['image'] ? req.files['image'][0].filename : undefined;
    const idProof = req.files['idproof'] ? req.files['idproof'][0].filename : undefined;
    
    try {
        // Validate inputs
        if (!name || !phone || !password  || !dateOfBirth || !blood || !email || !idProof || !address) {
            return res.status(400).json({ message: "All fields are required" });
        }
        
        // Check if the phone number already exists
        const existingUser = await userModel.findOne({ phone });
        if (existingUser) {
            return res.status(409).json({ message: "Phone number already exists" });
        }
        // const expiryDate = moment().add(duration, 'months').toDate();
        const expiryDate = moment().add(duration, 'days').toDate();

        
        // Create the user
        const newUser = await userModel.create({
            image,
            idProof,
            address,
            name,
            phone,
            password,
            height,
            weight,
            dateOfBirth,
            blood,
            email,
            authenticate: true,
            newUser:true,
        });
        
        
        // Log the successful creation
        // console.log("New user created:", newUser, newPlanOrder);

        // Respond with success message and the created user
        res.status(200).json({
            message: 'User posted successfully',
            user: newUser
        });
        
    } catch (err) {
        // Log the error
        console.error("Error posting user:", err);

        // Respond with a generic error message
        res.status(500).json({ message: 'An error occurred while posting user' });
    }
});



exports.postUser = asyncHandler(async (req, res) => {
    const { name, phone, password, height, weight, dateOfBirth, blood, email, modeOfPayment, planId, planName, amount, duration, address, dateOfJoining} = req.body; 
    const image = req.files['image'] ? req.files['image'][0].filename : undefined;
    const idProof = req.files['idProof'] ? req.files['idProof'][0].filename : undefined;

    console.log("this is the body", req.body)

  
    
    try {
        // Validate inputs
        if ( !phone || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        
        // Check if the phone number already exists
        const existingUser = await userModel.findOne({ phone });
        if (existingUser) {
            return res.status(409).json({ message: "Phone number already exists" });
        }
        // const expiryDate = moment().add(duration, 'months').toDate();
         const expiryDate = moment(dateOfJoining).add(duration, 'days').toDate();

        
        // Create the user
        const newUser = await userModel.create({
            image,
            name,
            phone,
            password,
            height,
            weight,
            dateOfBirth,
            blood,
            email,
            idProof:idProof,
            address,
            authenticate: true,
            createdAt:dateOfJoining
        });
        const newPlanOrder = await plandOrderModel.create({
            userId: newUser._id,
            plandId: planId,
            name: planName,
            amount: amount,
            duration: duration,
            expiryDate: expiryDate,
            modeOfPayment: modeOfPayment,
            userName: name,
            activeStatus:'Active',
            showUser:true,
            selectedAt:dateOfJoining
        })
        
        // Log the successful creation
        console.log("New user created:", newUser, newPlanOrder);

        // Respond with success message and the created user
        res.status(200).json({
            message: 'User posted successfully',
            user: newUser
        });
        
    } catch (err) {
        // Log the error
        console.error("Error posting user:", err);

        // Respond with a generic error message
        res.status(500).json({ message: 'An error occurred while posting user' });
    }
});


exports.createUser = asyncHandler(async (req, res) => {
    const { name, phone, password, height, weight, dateOfBirth, blood, email, modeOfPayment, planId, planName, amount, duration} = req.body; 
    const image = req.file ? req.file.filename : undefined;
    
    try {
        // Validate inputs
        if (!name || !phone || !password || !height || !weight || !dateOfBirth || !blood || !email) {
            return res.status(400).json({ message: "All fields are required" });
        }
        
        // Check if the phone number already exists
        const existingUser = await userModel.findOne({ phone });
        if (existingUser) {
            return res.status(409).json({ message: "Phone number already exists" });
        }
        // const expiryDate = moment().add(duration, 'months').toDate();
        const expiryDate = moment().add(duration, 'days').toDate();

        
        // Create the user
        const newUser = await userModel.create({
            image,
            name,
            phone,
            password,
            height,
            weight,
            dateOfBirth,
            blood,
            email,
            // expiryDate,
            // duration,
            // amount,
            // planName,
            // planId,
            // modeOfPayment,
            // activeStatus:"Active",
            // authenticate: true,
        });
        const newPlanOrder = await plandOrderModel.create({
            userId: newUser._id,
            plandId: planId,
            name: planName,
            amount: amount,
            duration: duration,
            expiryDate: expiryDate,
            modeOfPayment: modeOfPayment,
            userName: name,
            activeStatus:'Pending'
        })
        
        // Log the successful creation
        console.log("New user created:", newUser, newPlanOrder);

        // Respond with success message and the created user
        res.status(200).json({
            message: 'User posted successfully',
            user: newUser
        });
        
    } catch (err) {
        // Log the error
        console.error("Error posting user:", err);

        // Respond with a generic error message
        res.status(500).json({ message: 'An error occurred while posting user' });
    }
});





exports.userPostSignIn = asyncHandler(async(req, res) => {
    const { phone, password } = req.body;
    console.log(req.body,"the body is here")
    
    try {
        const postSignin = await userModel.findOne({ phone });

        if (!postSignin) {
            return res.status(400).json({ error: "Invalid phone number or password" });
        }

        if (!postSignin.authenticate) {
            return res.status(403).json({ error: "User is not authenticated" });
        }
        const isPasswordMatch = await bcrypt.compare(password, postSignin.password);

        if (!isPasswordMatch) {
            return res.status(400).json({ error: "Invalid phone number or password" });
        }

        const token = jwt.sign({ email: postSignin.email }, "myjwtsecretkey");

        // Update the admin document in the database to save the token
        await userModel.findByIdAndUpdate(postSignin._id, { token: token });

        const userProfile = {
            id: postSignin._id,
            name: postSignin.name,
            email: postSignin.email,
            phone: postSignin.phone,
            image: postSignin.image,
            blood: postSignin.blood,
            height: postSignin.height,
            weight: postSignin.weight,
            dateOfBirth: postSignin.dateOfBirth,
            planId: postSignin.planId,
            planName: postSignin.planName,
            amount: postSignin.amount,
            duration: postSignin.duration,
            expiryDate: postSignin.expiryDate,
            activeStatus: postSignin.activeStatus,
            idProof:postSignin.idProof,
            address:postSignin.address
        };
        console.log(postSignin.image, " the image is ")

        res.status(200).json({ token: token, user: userProfile });
        console.log(token,'the token is here')
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

exports.getAllUsers = asyncHandler(async(req,res)=>{
    try {
        const response = await userModel.find()
        res.status(200).json(response)
    } catch (error) {
        console.log(error)
    }
})

exports.getAllUsersReport = async (req, res) => {
    try {
      const { page = 1, limit = 10, month, year } = req.query;
  
      // Build the query object for filtering by month and year
      let query = {};
      if (month) {
        query.createdAt = {
          $gte: new Date(year, month - 1, 1),
          $lt: new Date(year, month, 1)
        };
      } else if (year) {
        query.createdAt = {
          $gte: new Date(year, 0, 1),
          $lt: new Date(parseInt(year) + 1, 0, 1)
        };
      }
  
      const users = await userModel.find(query)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .exec();
  
      const usersWithStatus = await Promise.all(users.map(async (user) => {
        const planOrders = await plandOrderModel.find({ userId: user._id });
        let status;
        if (planOrders.length === 0) {
          status = 'No plan yet';
        } else if (planOrders.length === 1) {
          status = 'New join';
        } else {
          status = 'Renewal';
        }
        return { ...user.toObject(), status };
      }));
  
      const count = await userModel.countDocuments(query);
  
      res.status(200).json({
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        data: usersWithStatus,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  };
  



exports.getUser = async (req, res) => {
    const search = req.query.search || '';
    const limit = parseInt(req.query.limit) || 10; // default limit to 10
    const skip = parseInt(req.query.skip) || 0;
  
    try {
      const query = { 
        revealed: false,
        name: { $regex: search, $options: 'i' }
      };
      const totalUsers = await userModel.countDocuments(query);
      const users = await userModel.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip);
      
      res.status(200).json({
        users,
        totalUsers
      });
    } catch (err) {
      console.error(err); 
      res.status(500).send('An error occurred while fetching data');
    }
  };
  
  


exports.getUserById = asyncHandler(async(req,res)=>{
    const {id} = req.params
    // console.log(req.params, 'the id is here')
    try{
        const response = await userModel.findById(id)
        res.status(200).json(response)
    }catch(err){
        console.log(err)
        res.status(500).send('An error occured while fetching data')
    }
})

exports.editUser = asyncHandler(async(req, res)=>{
    const {id} = req.params;
    const {name, phone, height, weight, dateOfBirth, blood, email, address} = req.body;
    const image = req.files['image'] ? req.files['image'][0].filename : undefined;
    const idProof = req.files['idproof'] ? req.files['idproof'][0].filename : undefined;
    try{  
        const update = {
            image:image, 
            address:address,
            idProof:idProof,
            name:name,
            phone:phone,
            height:height,
            weight:weight,
            dateOfBirth:dateOfBirth,
            blood:blood,
            email:email
        }
        const updateData = await userModel.findByIdAndUpdate(id, {$set:update}, {new:true})
        res.status(200).json(updateData)
       
    }catch(err){
        res.status(500).json({err:'error while updating data'})
    }
})

exports.deleteUser = asyncHandler(async(req, res)=>{
    const {id} = req.params
    try{
        const response = await userModel.findByIdAndDelete(id)
        res.status(200).json(response)
    }catch(err){
        console.log(err)
    }
})

exports.revealUser = asyncHandler(async(req,res)=>{
    const {id} = req.params
    try{
       const user =  await userModel.findById(id)
       user.revealed = true
       await user.save()
       res.status(200).send('success')
    }catch(err){
        console.log(err)
    }
})

exports.unrevealUser = asyncHandler(async(req,res)=>{
    const {id} = req.params
    try{
       const user =  await userModel.findById(id)
       user.revealed = false
       await user.save()
       res.status(200).send('success')
    }catch(err){
        console.log(err)
    }
})


exports.getrevealedUser = asyncHandler(async(req,res)=>{
    try{
       const user =  await userModel.find({revealed:true})
       res.send(user)
       console.log(user,'the user is this')
    }catch(err){
        console.log(err)
    }
})


exports.changepassword = asyncHandler(async(req, res)=>{
    const {id} = req.params
   
    const {oldPassword , newPassword, cPassword} = req.body;

    try {
        const changePasswrod = await userModel.findById(id)
        const passwordMatch = await bcrypt.compare(oldPassword, changePasswrod.password)
       
       
        if(!passwordMatch){
            res.status(403).json({message:"The current password is not exist"})
        }else if(newPassword === cPassword){

            changePasswrod.password = cPassword;
            const updateUser = await changePasswrod.save();
            res.status(200).json({message:'password has been changed',updateUser});

        }else{
            res.status(400).json({message:'Confirm password is incorrect'})
        }
    }catch(err){
        console.log(err)
    }
})

exports.getUserByPhone = asyncHandler(async (req, res) => {
    const { phone } = req.params;

    try {
        // Find the user based on phone number
        const user = await userModel.findOne({ phone });

        // If user not found, return 404 with an error message
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // If user found, return the user data
        res.status(200).json(user);
    } catch (err) {
        // Log and handle errors
        console.error("Error fetching user by phone:", err);
        res.status(500).json({ message: 'An error occurred while fetching user' });
    }
});


exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    console.log(email,'this is the mail')

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No user found with that email address' });
        }

        // Generate a token
        const token = crypto.randomBytes(20).toString('hex');

        // Set token and expiry date
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();

        // Send email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            secure: true,
            port: 465,
            debug: true // Enable debugging
        });

        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: 'Password Reset Request',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
            Please click on the following link, or paste this into your browser to complete the process:\n\n
            https://fitnesshpclient.web.app/resetpassword/${token}\n\n
            If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Password reset link sent to your email address' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'An error occurred' });
    }
});

exports.resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    try {
        // Find user by token and check if the token has expired
        const user = await userModel.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
        }

        // Check if the new passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user's password and clear the reset token fields
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'An error occurred' });
    }
});
