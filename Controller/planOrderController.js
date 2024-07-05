const asyncHandler = require('express-async-handler');
const plandOrderModel = require('../Model/plandOrderModel');
const moment = require('moment'); // Import moment library for date manipulation
const userModel = require('../Model/userModel')

// phonepay for testing purpose------------
const PHONE_PAY_HOST_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox';
const MERCHANT_ID ='PGTESTPAYUAT';
const SALT_INDEX = 1;
const SALT_KEY = '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399'



exports.postPlandOrder = asyncHandler(async(req,res)=>{
    const { userId, planId, name, amount, duration, userName, modeOfPayment } = req.body;
    console.log(req.body), 'the rusult'
    try{
        // Calculate expiry date by adding duration months to the current date
        const expiryDate = moment().add(duration, 'days').toDate();
        
        // Create plan order with expiry date
        await plandOrderModel.create({ userId, planId, name, amount, duration, expiryDate ,modeOfPayment, userName, activeStatus:'Active',showUser:true});
        const user = await userModel.findById(userId);
        user.authenticate = true
        await user.save();

        res.json({ message: 'User plan selected successfully' });
    } catch(err){
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

exports.spreadPlanForBuddy = asyncHandler(async(req,res)=>{
    const { userId, expiryDate ,amount, duration, userName, modeOfPayment, admin } = req.body;
    try {
        await plandOrderModel.create({ userId, amount, duration, expiryDate ,modeOfPayment, userName, activeStatus:'Active',showUser:true, admin});
        const user = await userModel.findById(userId);
        user.authenticate = true
        res.json({ message: 'User plan selected successfully' });
        await user.save();
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

exports.getPlanOrderByUser = asyncHandler(async (req, res) => {
    const { id: userId } = req.params;
    console.log(userId, 'the id of the user');
    try {
        const userPlanOrders = await plandOrderModel.find({ userId });

        // Check if any plan orders have expired or are nearly expired and update activeStatus accordingly
        const currentDate = moment();
        for (const planOrder of userPlanOrders) {
            const daysUntilExpiry = moment(planOrder.expiryDate).diff(currentDate, 'days');
            if (daysUntilExpiry <= 0) {
                // If the expiry date has passed, set activeStatus to "Expired"
                planOrder.activeStatus = "Expired";
            } else if (daysUntilExpiry <= 5) {
                // If the plan is within 5 days of expiry, set activeStatus to "Nearly Expire"
                planOrder.activeStatus = "Nearly Expire";
            }
            await planOrder.save(); // Save the updated plan order
        }

        console.log(userPlanOrders, "the user's plan orders");
        
        // Send the user's plan orders with updated activeStatus to the frontend
        res.json(userPlanOrders);
    } catch (error) {
        console.error('Error fetching user plan orders:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

exports.getLastPlanOrderOfUser = asyncHandler(async (req, res) => {
    const { id: userId } = req.params;
    console.log(userId, 'the id of the user');
    try {
        // Retrieve the last plan order for the user with activeStatus "Active" or "Nearly Expire"
        const lastPlanOrder = await plandOrderModel.findOne({userId})
        .sort({ selectedAt: -1 }) // Sorting to get the latest plan order
        .limit(1);

        if (!lastPlanOrder) {
            // If no plan orders found, send an empty response
            res.json([]);
            return;
        }

        // Calculate the active status for the last plan order
        const currentDate = moment();
        const daysUntilExpiry = moment(lastPlanOrder.expiryDate).diff(currentDate, 'days');
        if (daysUntilExpiry <= 0) {
            // If the expiry date has passed, set activeStatus to "Expired"
            lastPlanOrder.activeStatus = "Expired";
            lastPlanOrder.showUser = false
        } else if (daysUntilExpiry <= 5) {
            // If the plan is within 5 days of expiry, set activeStatus to "Nearly Expire"
            lastPlanOrder.activeStatus = "Nearly Expire";
            lastPlanOrder.showUser = true
        }
        
        console.log(lastPlanOrder, "the user's last plan order");
        
        // Send the last plan order with updated activeStatus to the frontend
        res.json(lastPlanOrder);
    } catch (error) {
        console.error('Error fetching user last plan order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




exports.getLastPlanOrderOfAllUsers = asyncHandler(async (req, res) => {
    try {
        // Retrieve the last plan order for all users
        const allUsersLastPlanOrders = await plandOrderModel.aggregate([
            {
                $group: {
                    _id: "$userId",
                    lastPlanOrder: { $last: "$$ROOT" } // Get the last plan order for each user
                }
            },
            {
                $project: {
                    _id: 0,
                    userId: "$_id",
                    lastPlanOrder: 1
                }
            }
        ]);

        if (!allUsersLastPlanOrders || allUsersLastPlanOrders.length === 0) {
            // If no plan orders found for any user, send an empty response
            res.json([]);
            return;
        }

        // Iterate over each user's last plan order to calculate activeStatus
        const currentDate = moment();
        allUsersLastPlanOrders.forEach(userOrder => {
            const lastPlanOrder = userOrder.lastPlanOrder;
            const daysUntilExpiry = moment(lastPlanOrder.expiryDate).diff(currentDate, 'days');
            if (daysUntilExpiry <= 0) {
                lastPlanOrder.activeStatus = "Expired";
                lastPlanOrder.showUser = false
            } else if (daysUntilExpiry <= 5) {
                lastPlanOrder.activeStatus = "Nearly Expire";
                lastPlanOrder.showUser = true
            }
        });

        console.log(allUsersLastPlanOrders, "last plan orders of all users");

        // Send the last plan orders with updated activeStatus to the frontend
        res.json(allUsersLastPlanOrders);
    } catch (error) {
        console.error('Error fetching last plan orders of all users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



exports.getPlanDetailsById = asyncHandler(async(req,res)=>{
    const {id} = req.params
    console.log(req.params,'haihfoiashdfoiasiodfhioasdhpfio')
    try{
        const response = await plandOrderModel.findById(id)
        res.status(200).json(response)
    }catch(err){
        console.log(err)
        res.status(500).message('an error occured while fetching data')
    }
})

exports.deletePlanOrder = asyncHandler(async(req,res)=>{
    const {id} = req.params
    try{
     await plandOrderModel.findByIdAndDelete(id)
     res.status(200).send('the item deleted successfully')
    }catch(err){
        console.log(err)
        res.status(500).send('an error occured while deleting item')
    }
})




exports.postPendingOrder = asyncHandler(async(req,res)=>{
    const { userId, planId, name, amount, duration, userName, modeOfPayment } = req.body;
    try{
        // Calculate expiry date by adding duration months to the current date
        const expiryDate = moment().add(duration, 'days').toDate();
        console.log(expiryDate,'this is the expiry date')
        // Create plan order with expiry date and activeStatus set to "Pending"
        await plandOrderModel.create({ 
            userId,
            planId, 
            userName,
            name, 
            amount, 
            duration, 
            expiryDate, 
            modeOfPayment,
            activeStatus: "Pending" // Set activeStatus to "Pending"
        });
        
        res.json({ message: 'User plan selected successfully' });
    } catch(err){
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

exports.getPendingPlanOrders = asyncHandler(async (req, res) => {
    try {
        // Find plan orders where activeStatus is "Pending" and buddyPlan is false
        const pendingPlanOrders = await plandOrderModel.find({ 
            activeStatus: "Pending",
            buddyPlan: false
        });
        
        res.json(pendingPlanOrders);
        console.log(pendingPlanOrders,'this is th pendsing plan')
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.getBuddyPending = asyncHandler(async (req, res) => {
    try {
        // Find plan orders where activeStatus is "Pending" and buddyPlan is false
        const pendingPlanOrders = await plandOrderModel.find({ 
            activeStatus: "Pending",
            buddyPlan: true
        });
        
        res.json(pendingPlanOrders);
        console.log(pendingPlanOrders,'this is th pendsing plan')
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

exports.getPlanOrders = asyncHandler(async (req, res) => {
    try {
      const { page = 1, month = '', date = '' } = req.query;
      const limit = 10; // Number of results per page
      let query = {};
  
      // Filter by month within the current year
      if (month) {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, month - 1, 1);
        const endDate = new Date(currentYear, month, 0);
        query.selectedAt = { $gte: startDate, $lte: endDate };
      }
  
      // Filter by specific date
      if (date) {
        const specificDate = new Date(date);
        const nextDate = new Date(specificDate);
        nextDate.setDate(nextDate.getDate() + 1);
        query.selectedAt = { $gte: specificDate, $lt: nextDate };
      }
  
      const count = await plandOrderModel.countDocuments(query);
      const totalPages = Math.ceil(count / limit);
      const results = await plandOrderModel.find(query)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ selectedAt: -1 });
  
      res.status(200).json({ data: results, totalPages });
    } catch (error) {
      console.error('Error fetching plan orders:', error);
      res.status(500).json({ error: 'An error occurred while fetching plan orders' });
    }
  });
  



exports.updateOrderToActive = asyncHandler(async(req,res)=>{
    const { id } = req.params;
    const {userId} = req.body;
    console.log(userId, 'the user Id ')
    try{
        // Find the plan order by its ID
        const order = await plandOrderModel.findById(id);
        const user = await userModel.findById(userId)
        
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        // Update the activeStatus to "Active" and show value to false
        order.activeStatus = "Active";
        order.show = false;
        order.showUser = true;
        user.authenticate = true

        // Save the updated order
        await order.save();
        await user.save();

        res.json({ message: 'Order updated to Active successfully' });
    } catch(err){
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

exports.updateOrderToRejected = asyncHandler(async(req,res)=>{
    const { id } = req.params;
    const {userId} = req.body;
    try{
        // Find the plan order by its ID
        const order = await plandOrderModel.findById(id);
        const user = await userModel.findById(userId)
        
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        // Update the activeStatus to "Rejected" and show value to false
        order.activeStatus = "Rejected";
        order.show = false;
        order.showUser = false;
        user.authenticate = false;

        // Save the updated order
        await order.save();
        await user.save();

        res.json({ message: 'Order updated to Rejected successfully' });
    } catch(err){
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

exports.getAllStatus = asyncHandler(async(req,res)=>{
    try {
        const possibleStatuses = ["Active", "Expired", "Nearly Expire", "Pending", "Rejected"];
        res.status(200).json(possibleStatuses).send('All statuses fetched successfully');
        console.log(possibleStatuses, 'All statuses');
    } catch (error) {
        console.log(error);
        res.status(500).send('An error occurred while fetching all statuses.');
    }
});

exports.getActiveStatus = asyncHandler(async (req, res) => {
    try {
        // Retrieve the last plan order for all users
        const allUsersLastPlanOrders = await plandOrderModel.aggregate([
            {
                $group: {
                    _id: "$userId",
                    lastPlanOrder: { $last: "$$ROOT" } // Get the last plan order for each user
                }
            },
            {
                $project: {
                    _id: 0,
                    userId: "$_id",
                    lastPlanOrder: 1
                }
            }
        ]);

        if (!allUsersLastPlanOrders || allUsersLastPlanOrders.length === 0) {
            // If no plan orders found for any user, send an empty response
            res.json([]);
            return;
        }

        // Iterate over each user's last plan order to calculate activeStatus
        const currentDate = moment();
        allUsersLastPlanOrders.forEach(userOrder => {
            const lastPlanOrder = userOrder.lastPlanOrder;
            const daysUntilExpiry = moment(lastPlanOrder.expiryDate).diff(currentDate, 'days');
            if (daysUntilExpiry <= 0) {
                lastPlanOrder.activeStatus = "Expired";
                lastPlanOrder.showUser = false;
            } else if (daysUntilExpiry <= 5) {
                lastPlanOrder.activeStatus = "Nearly Expire";
                lastPlanOrder.showUser = true;
            } else {
                lastPlanOrder.activeStatus = "Active"; // Set activeStatus to "Active"
                lastPlanOrder.showUser = true; // Assuming to show the user if it's active
            }
        });

        console.log(allUsersLastPlanOrders, "last plan orders of all users");

        // Filter to get only entries with activeStatus equal to "Active"
        const activeOrders = allUsersLastPlanOrders.filter(userOrder => userOrder.lastPlanOrder.activeStatus === "Active");

        // Send the last plan orders with updated activeStatus to the frontend
        res.json(activeOrders);
    } catch (error) {
        console.error('Error fetching last plan orders of all users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

exports.createBuddyPlan = asyncHandler(async(req,res)=>{
    const {userId, userName, modeOfPayment, buddyPlanMembers, planId, amount, duration} = req.body
    const expiryDate = moment().add(duration, 'days').toDate();

    try {
        await plandOrderModel.create({
            userId:userId,
            userName:userName,
            modeOfPayment:modeOfPayment,
            activeStatus:"Pending",
            buddyPlanMembers:buddyPlanMembers,
            buddyPlan:true,
            planId:planId,
            amount:amount,
            duration:duration,
            expiryDate:expiryDate
        })
        res.status(200).send('Buddy plan created successfully')
    } catch (error) {
        console.log(error)
        res.status(500).send('An error occured while creating the buddy plan')
    }
})

exports.updateBuddyPlan = asyncHandler(async (req, res) => {
    const { amount, buddyPlanMembers } = req.body;
    const { id } = req.params;
const planMembersCount = buddyPlanMembers.length + 1;
const splitAmount = amount / planMembersCount;
console.log(planMembersCount,'this is the members count')
console.log(amount,'this is the members amount')
console.log(splitAmount,'this is the split amount')

    try {
        // Find the existing plan order by its ID
        const existingPlanOrder = await plandOrderModel.findById(id);

        if (existingPlanOrder) {
            // Update the existing plan order with the new amount and set status to Active
            existingPlanOrder.amount = splitAmount;
            existingPlanOrder.activeStatus = "Active";
            existingPlanOrder.showUser = true;
            await existingPlanOrder.save();

            res.status(200).send('Buddy plan activated and updated successfully');
        } else {
            res.status(502).send('No pending buddy plan found to activate');
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('An error occurred while activating the buddy plan');
    }
});


exports.buddyToActiveBuddy = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        // Find the plan orders containing the specified buddy ID in buddyPlanMembers
        const planData = await plandOrderModel.find({ buddyPlanMembers: id });

        if (planData.length > 0) {
            // Iterate through each plan order and update it
            for (let plan of planData) {
                // Remove the buddy ID from buddyPlanMembers
                plan.buddyPlanMembers = plan.buddyPlanMembers.filter(member => member.toString() !== id);

                // Add the buddy ID to activedBuddyPlanMembers
                if (!plan.activedBuddyPlanMembers.includes(id)) {
                    plan.activedBuddyPlanMembers.push(id);
                }

                // Save the updated plan order
                await plan.save();
            }

            res.status(200).json({ message: 'Buddy successfully moved to activeBuddyMembers', updatedPlans: planData });
        } else {
            res.status(404).json({ message: 'No plan orders found with the specified buddy ID' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
});