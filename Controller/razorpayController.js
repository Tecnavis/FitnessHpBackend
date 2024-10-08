const asyncHandler = require('express-async-handler');
const Razorpay = require('razorpay');
const crypto = require('crypto')
const userModel = require('../Model/userModel')
const planOrderModel = require('../Model/plandOrderModel');
const notificationModel = require('../Model/notificationModal')
const moment = require('moment');


const razorpayKeyId = 'rzp_test_RP9jKB0e45QR7x'
const razorpayKeySecret = 'tJ3FfCssvJOJfHejrzBXiK5H'

exports.order = asyncHandler(async(req,res) => {
 try {
    const razorpay = new Razorpay({
       key_id: razorpayKeyId,
       key_secret: razorpayKeySecret
    })
    
    if(!req.body){
        return res.status(400).send('Error req body not found')
    }
    const options = req.body
    const order = await razorpay.orders.create(options)
    if(!order){
        return res.status(401).send('Error while creating order')
    }
    res.json(order)
 } catch (error) {
    console.log(err)
    res.status(500).send('An error occured');
 }
})

exports.validate = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, planId, name, amount, duration, userName, modeOfPayment, image } = req.body;
   

    const sha = crypto.createHmac("sha256", razorpayKeySecret);
    sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = sha.digest("hex");

    if (digest !== razorpay_signature) {
        await planOrderModel.create({
            userId,
            planId,
            name,
            amount,
            duration,
            modeOfPayment,
            userName,
            activeStatus: 'Failed',
            showUser: false
        });
        return res.status(400).json({ msg: "Transaction is not legit!" });
    }

    const expiryDate = moment().add(duration, 'days').toDate();

    const newPlanOrder = await planOrderModel.create({
        userId,
        planId,
        name,
        amount,
        duration,
        expiryDate,
        modeOfPayment,
        userName,
        activeStatus: 'Active',
        showUser: true
    });

    // Create a new notification
    await notificationModel.create({
        name:userName,
        image,
        amount,
        planId: newPlanOrder._id
    });

    res.json({ msg: "Transaction is legit!", orderId: razorpay_order_id, paymentId: razorpay_payment_id, planId: newPlanOrder._id });
});