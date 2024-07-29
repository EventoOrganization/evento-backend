// const { Socket } = require("socket.io");
const Models = require("../models/index");
const moment = require("moment");
const helper = require("../helper/helper");
// console.log("this is date", moment().format("YYYY-MM-DD"));
// console.log("this is time", moment().format("LTS"));
// const currentTime = moment(date).tz(targetTimeZone).format('HH:mm');
// const currentDateInTimeZone = moment().tz(targetTimeZone).format('YYYY-MM-DD');
function getRandomElement(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}
function removeElementFromArray(array, element) {
  const index = array.indexOf(element);
  if (index !== -1) {
    array.splice(index, 1);
  }
}
module.exports = function (io) {

  io.on("connection", (socket) => {
    // http://192.168.1.210:8747/ when from forntend side start on it give this url instead of localhost give ipV4
    console.log("connected user", socket.id);
    //Connect the user  //Test pass
    socket.on("connect_user", async function (data) {
      try {
        const socketId = socket.id;
        const checkUser = await Models.socketuser.findOne({
          userId: data.userId,
        });

        if (checkUser) {
          await Models.socketuser.updateOne(
            { userId: data.userId },
            { $set: { status: 1, socketId: socketId } }
          );
        } else {
          await Models.socketuser.create({
            userId: data.userId,
            socketId: socketId,
            status: 1,
          });
        }

        let success_msg = {
          success_msg: "connected successfully",
        };
        socket.emit("connect_user_listener", success_msg);
      } catch (error) {
        throw error
      }
    });
      //this is for create group in data we want adminId and arrays of userIds  test pass
    socket.on("create_group", async function (data) {
        try {
          if (!data.groupUserIds.includes(data.adminId)) {
            data.groupUserIds.push(data.adminId);
          }  
           let saveData = {
            admin: data.adminId,
            users: data.groupUserIds,
            groupName: data.groupName,
            date: moment().format("YYYY-MM-DD"),
            time: moment().format("LT"),
          };
          let response = await Models.groupChatModel.create(saveData);
          let foundResponse = await Models.groupChatModel.findOne({ _id: response._id });          
          let success_msg = {
            success_msg: "Group create successfully",
            reponse: foundResponse,
          };
          socket.emit("create_group_listener", success_msg);
        } catch (error) {
          throw error
        }
      });
    //On click user seen the all message of user one to one after click on user then seen all chat of one user //Test pass
    // Or with groupId find the all messages of groups need groupId and senderId
    socket.on("users_chat_list", async (get_data) => {
      try {
        if(get_data.groupId){
            const findConstant = await Models.chatconstant.find({
               groupId:get_data.groupId
              });
            if(findConstant){
              await Models.message.updateMany(
                    {groupId:get_data.groupId},
                    {
                      $addToSet: {
                        groupMessage_read_by: get_data.senderId,
                      },
                    })
                   const chatList = await Models.message
                      .find({
                        $and: [
                          {
                            groupId: get_data.groupId, 
                          },
                          {
                            groupMessage_clear: { $nin: [get_data.senderId] }
                          },
                        ],
                      })
                      .populate({
                        path: "senderId reciverId",
                        select: "id name profileImage email",
                        model: Models.userModel,
                      })
                      // .populate({
                      //   path: "senderId groupUserIds", // Populate both senderId and groupUserIds
                      //   select: "profileImage", // Select the fields you want to populate
                      // });
      
                    const count = await Models.message.countDocuments({
                      $and: [
                        {
                          $or: [
                                {
                                  groupId: get_data.groupId, 
                                },
                               { constantId: findConstant._id },
                          ],
                        },
                        {
                          is_delete: { $ne: get_data.senderId },
                          // is_read: 0,
                          groupMessage_read_by: { $nin: [get_data.senderId] },
                        },
                      ],
                    });
                    const success_messages = {
                      success_message: "Users group Chats",
                      code: 200,
                      unread_message_count: count,
                      // getdatas: chatList,
                      getdata: chatList.map((message) => {
                        const isMessageFromSender =
                          // message.senderId.toString() === get_data.senderId.toString();
                          message.senderId === get_data.senderId;
                        return {
                          ...message.toObject(),
                          messageSide: isMessageFromSender ? "sender" : "other",
                        };
                      }),
                    };
                    socket.emit("users_chat_list_listener", success_messages);

            }else {
              const success_message = {
                error: "Users Chat not found",
                code: 403,
              };
              socket.emit("users_chat_list_listener", success_message);
            }
        }else{
            const findConstant = await Models.chatconstant.find({
                $or: [
                  { senderId: get_data.senderId, reciverId: get_data.reciverId },
                  { reciverId: get_data.senderId, senderId: get_data.reciverId },
                ],
              });
      
              if (findConstant) {
                await Models.message.updateMany(
                  {reciverId:get_data.senderId,
                   senderId: get_data.reciverId
                  },
                  {
                    $set: { is_read: 1 },
                  })
                const chatList = await Models.message.find({
                  $and: [
                    {
                      $or: [
                        {
                          senderId: get_data.senderId,
                          reciverId: get_data.reciverId,
                        },
                        {
                          reciverId: get_data.senderId,
                          senderId: get_data.reciverId,
                        },
                        { constantId: findConstant._id },
                      ],
                    },
                    {
                      is_delete: { $ne: get_data.senderId },
                    },
                  ],
                }).populate({
                  path: "senderId reciverId",
                  select: "id name profileImage email",
                  model: Models.userModel,
                })
                // .populate('senderId', 'profileImage','email') // Populate sender's profile image
                // .populate('reciverId', 'profileImage','email'); // Populate receiver's profile image;
                const count = await Models.message.countDocuments({
                  $and: [
                    {
                      $or: [
                        // {
                        //   senderId: get_data.senderId,
                        //   reciverId: get_data.reciverId,
                        // },
                        {
                          reciverId: get_data.senderId,
                          senderId: get_data.reciverId,
                        },
                        // { constantId: findConstant._id },
                      ],
                    },
                    {
                      is_delete: { $ne: get_data.senderId },
                      is_read: 0,
                    },
                  ],
                });
                const success_messages = {
                  success_message: "Users Chats",
                  code: 200,
                  unread_message_count:count,
                  // getdatas: chatList,
                  getdata: chatList.map((message) => {
                    const isMessageFromSender =
                      // message.senderId.toString() === get_data.senderId.toString();
                      message.senderId === get_data.senderId;
                    return {
                      ...message.toObject(),
                      messageSide: isMessageFromSender ? "sender" : "other",
                    };
                  }),
                };
                socket.emit("users_chat_list_listener", success_messages);
              } else {
                const success_message = {
                  error: "Users Chat not found",
                  code: 403,
                };
                socket.emit("users_chat_list_listener", success_message);
              }
        }
      } catch (error) {
        throw error
      }
    });
    //List of all user with whom sender-User do chat also count the unread message for each user  //Test pass
    //also with groups  //test pass
    socket.on("user_constant_list", async (get_data) => {
      try {
        const { filter, senderId } = get_data;
        let order;
        if (filter === 1) {
          order = { createdAt: 1 }; // Sort by old to new
        } else if (filter === 2) {
          order = { createdAt: -1 }; // Sort by new to old
        }else{
          order={updatedAt:-1}
        }
    
        // Build the query to find chat constants
        const where = {
          $or: [
            { senderId: senderId, is_block: { $ne: 1 } },
            { reciverId: senderId, is_block: { $ne: 1 } },
            { senderId: senderId, is_block: { $exists: false } },
            { reciverId: senderId, is_block: { $exists: false } },
            { groupUserIds: senderId },
          ],
        };
    
        if (filter == 3) {
          where.is_favourite = 1;
        }
    
        // Find all chat constants that match the criteria
        const constantList = await Models.chatconstant
          .find(where)
          .populate({
            path: "lastmessage",
            select: "senderId reciverId message message_type is_read",
            model: Models.message,
          })
          .populate({
            path: "senderId reciverId",
            select: "id name profileImage email",
            model: Models.userModel,
          })
          .populate({
            path: "groupId",
            select: "id eventId",
            model: Models.groupChat,
            populate:{
              path: "eventId",
              select: "id title details",
              model: Models.Event,
            }
          })
          .sort(order);
          
    const userIds = constantList.map((constant) => {
  if (constant.senderId && constant.senderId._id && constant.senderId._id.toString() === senderId) {
    if (constant.reciverId != null) {
      return constant.reciverId._id ? constant.reciverId._id.toString() : constant.reciverId;
    } 
    // else if (constant.groupUserIds.length > 0) {
    //   // Assuming you want to include groupUserIds when reciverId is null
    //   return constant.groupUserIds.map((groupId) => groupId.toString());
    else if (constant.groupId) {
      // Assuming you want to include groupUserIds when reciverId is null
      return constant.groupId;
    } else {
      return null; // Handle the case when both reciverId and groupUserIds are null
    }
  }else{
    if (constant.senderId && constant.senderId._id && constant.senderId._id.toString() === senderId) {
      return constant.reciverId != null
        ? constant.reciverId._id?.toString() || constant.reciverId
        : constant.reciverId;
    }
     else {
      return constant.senderId != null
        ? constant.senderId._id.toString()
        : constant.senderId;
    }
  }
    });

    const unreadMessageCounts = {};
      
      for (const userId of userIds) {
          if (typeof userId === 'string') {
         // Handle one-on-one chats
      const count = await Models.message.countDocuments({
      $and: [
        {
          $or: [
            {
              senderId: userId,
            },
          ],
        },
        {
          reciverId: senderId, // Assuming senderId is the receiver
          is_read: 0,
          groupMessage_read_by: { $nin: [get_data.senderId] },
        },
      ],
      });
        unreadMessageCounts[userId] = count;
     } else if (typeof userId === 'object') {
      const groupMessages = await Models.message.find({
        groupId: userId,
      }).select('senderId groupMessage_read_by');
      const count = groupMessages.reduce((total, message) => {
      // Check if senderId is not in the groupMessage_read_by array
      if (!message.groupMessage_read_by.includes(senderId)) {
        return total + 1;
      }
      return total;
    }, 0);
    

    unreadMessageCounts[userId] = count;
    
  }
}

        // Add unread message counts to the constantList
     constantList.forEach((constant) => {
          const senderId = constant.senderId
            ? constant.senderId._id.toString()
            : "";
          const reciverId = constant.reciverId
            ? constant.reciverId._id.toString()
            : "";
          const userId =constant.groupId?constant.groupId.toString(): senderId === get_data.senderId ? reciverId : senderId;
          if (userId) {
            constant.unreadCount = unreadMessageCounts[userId] || "0";
          } else {
            constant.unreadCount = 0; // Handle the case where both senderId and receiverId are null
          }
       });
    
        const success_message = {
          success_message: "User Constant Chats List with Unread Message Count",
          code: 200,
          getdata: constantList,
        };
    
        socket.emit("user_constant_chat_list", success_message);
      } catch (error) {
        throw error;
      }
    });
    //Message send //Test pass    
    socket.on("send_message", async function (data) {
      try {
        
        if (data.groupId) {

          let checkChatConstant = await Models.chatconstant.findOne({
            groupId: data.groupId,
          });
          let receiverId=data.groupUserIds.filter(item => item !== data.senderId);
          if (checkChatConstant) {
            let saveMsg = await Models.message.create({
              senderId: data.senderId,
              groupUserIds: data.groupUserIds,
              message: data.message,
              message_type: data.message_type,
              constantId: checkChatConstant._id,
              groupId: data.groupId,
              date: moment().format("YYYY-MM-DD"),
              time: moment().format("LT"),
            });
            await Models.message.updateMany(
              {groupId:data.groupId},
              {
                $addToSet: {
                  groupMessage_read_by: data.senderId,
                },
              })
            await Models.chatconstant.updateOne(
              { _id: checkChatConstant._id },
              {
                lastmessage: saveMsg._id,
                date: moment().format("YYYY-MM-DD"),
                time: moment().format("LT"),
              }
            );
            const getMsg = await Models.message.findOne({
              senderId: saveMsg.senderId,
              groupUserIds: { $in: saveMsg.groupUserIds }, // Use $in to match any of the values in the array
              _id: saveMsg._id,
            })
              .populate({
                path: "groupUserIds",
                select: "id name profileImage", // Select the fields you want to populate
              })
              .populate({
                path: "senderId",
                select: "id name profileImage", // Select the fields you want to populate
              })
            
              const getGroupDetail = await Models.message.findOne({
                senderId: saveMsg.senderId,
                groupUserIds: { $in: saveMsg.groupUserIds }, // Use $in to match any of the values in the array
                _id: saveMsg._id,
              }).
                populate({
                path: "groupId",
                select: "id groupName image users admin eventId", // Select the fields you want to populate
              });
            if (getMsg) {
              // getMsg = getMsg.length > 0 ? getMsg[0] : getMsg;
                // Iterate through the groupUserIds
                socket.emit("send_message_emit", getMsg);
                for (const userId of receiverId) {
                  const get_socket_id = await Models.socketuser.findOne({
                    userId: userId,
                  });
  
                  if (get_socket_id) {
                    io.to(get_socket_id.socketId).emit(
                      "send_message_emit",
                      getMsg
                    );
                  }
                  // socket.emit("send_message_emit", getMsg);
                  // Find the user to get deviceToken and deviceType
                  const user = await Models.userModel.findOne({
                    _id: userId,
                  });
  
                  if (user && user.deviceToken) {
                    const deviceToken = user.deviceToken;
                    const deviceType = user.deviceType;
                    getMsg.deviceToken=deviceToken;
                    getMsg.deviceType=deviceType;
                    let datas={
                      getMsg,deviceToken,deviceType,chatType:2,getGroupDetail
                    }
                   await helper.sendPushToIosChat(datas)
                  }
                }
              // socket.emit("send_message_emit", getMsg);
            }
          } else {
            let createChatConstant = await Models.chatconstant.create({
              senderId: data.senderId,
              groupUserIds: data.groupUserIds,
              groupId: data.groupId,
            });
        
            let saveMsg = await Models.message.create({
              senderId: data.senderId,
              groupUserIds: data.groupUserIds,
              message: data.message,
              message_type: data.message_type,
              constantId: createChatConstant._id,
              groupId: data.groupId,
              date: moment().format("YYYY-MM-DD"),
              time: moment().format("LT"),
            });
            await Models.chatconstant.updateOne(
              { _id: createChatConstant._id.toString() },
              {
                lastmessage: saveMsg._id,
                date: moment().format("YYYY-MM-DD"),
                time: moment().format("LT"),
              }
            );
           
            const getMsg = await Models.message.findOne({
              senderId: saveMsg.senderId.toString(),
              groupUserIds: { $in: saveMsg.groupUserIds }, // Use $in to match any of the values in the array
              _id: saveMsg._id,
            })
              .populate({
                path: "groupUserIds",
                select: "id name profileImage", // Select the fields you want to populate
              })
              .populate({
                path: "senderId",
                select: "id name profileImage", // Select the fields you want to populate
              })
              const getGroupDetail = await Models.message.findOne({
                senderId: saveMsg.senderId,
                groupUserIds: { $in: saveMsg.groupUserIds }, // Use $in to match any of the values in the array
                _id: saveMsg._id,
              }).
                populate({
                path: "groupId",
                select: "id groupName image users admin eventId", // Select the fields you want to populate
              });
             
            if (getMsg) {
              // getMsg = getMsg.length > 0 ? getMsg[0] : getMsg;
                // Iterate through the groupUserIds
                socket.emit("send_message_emit", getMsg);
                for (const userId of receiverId) {
                  const get_socket_id = await Models.socketuser.findOne({
                    userId: userId,
                  });
  
                  if (get_socket_id) {
                    io.to(get_socket_id.socketId).emit(
                      "send_message_emit",
                      getMsg
                    );
                  }
                  // Find the user to get deviceToken and deviceType
                  const user = await Models.userModel.findOne({
                    _id: userId,
                  });
  
                  if (user && user.deviceToken) {
                    const deviceToken = user.deviceToken;
                    const deviceType = user.deviceType;
                    getMsg.deviceToken=deviceToken;
                    getMsg.deviceType=deviceType;
                    let datas={
                      getMsg,deviceToken,deviceType,chatType:2,getGroupDetail
                    }
                   await helper.sendPushToIosChat(datas)
                  }
                }
            }
          }
        } else {
          let checkChatConstant = await Models.chatconstant.findOne({
            $or: [
              { senderId: data.senderId, reciverId: data.reciverId },
              { senderId: data.reciverId, reciverId: data.senderId },
            ],
          });
  
          if (checkChatConstant) {
            let saveMsg = await Models.message.create({
              senderId: data.senderId,
              reciverId: data.reciverId, 
              message: data.message,
              message_type: data.message_type,
              constantId: checkChatConstant.id,
              date: moment().format("YYYY-MM-DD"),
              time: moment().format("LT"),
            });
            await Models.chatconstant.updateOne(
              { _id: checkChatConstant._id },
              {
                lastmessage: saveMsg._id,
                date: moment().format("YYYY-MM-DD"),
                time: moment().format("LT"),
              }
            );
  
            let getMsg = await Models.message
              .findOne({
                senderId: saveMsg.senderId,
                reciverId: saveMsg.reciverId,
                _id: saveMsg._id,
              })
              .populate([
                {
                  path: "senderId",
                  select: "id name profileImage",
                },
                {
                  path: "reciverId",
                  select: "id name profileImage",
                },
              ]);
              if (getMsg) {
                getMsg = getMsg.length > 0 ? getMsg[0] : getMsg;
            
                const get_socket_id = await Models.socketuser.findOne ({
                  userId: data.reciverId,
                });
                if (get_socket_id) {
                  io
                    .to (get_socket_id.socketId)
                    .emit ('send_message_emit', getMsg);
                }
                socket.emit("send_message_emit", getMsg);
                let user=await Models.userModel.findOne({
                  _id:data.reciverId
                })   
                if(user&&user.deviceToken){
                  let deviceToken=user.deviceToken;
                  let deviceType=user.deviceType;
                  getMsg.deviceToken=deviceToken;
                  getMsg.deviceType=deviceType;
                  let datas={
                    getMsg,deviceToken,deviceType,chatType:1
                  }
                 await helper.sendPushToIosChat(datas)
                }

                // socket.emit ('send_message_emit', getMsg);
              }
          } else {
            let createChatConstant = await Models.chatconstant.create({
              senderId: data.senderId,
              reciverId: data.reciverId,
            });
            let saveMsg = await Models.message.create({
              senderId: data.senderId,
              reciverId: data.reciverId,
              message: data.message,
              message_type: data.message_type,
              constantId: createChatConstant._id,
              date: moment().format("YYYY-MM-DD"),
              time: moment().format("LT"),
            });
  
            await Models.chatconstant.updateOne(
              { _id: createChatConstant._id },
              {
                lastmessage: saveMsg._id,
                date: moment().format("YYYY-MM-DD"),
                time: moment().format("LT"),
              }
            );
  
            let getMsg = await Models.message
              .findOne({
                senderId: data.senderId,
                reciverId: data.reciverId,
                _id: saveMsg._id,
              })
              .populate([
                {
                  path: "senderId",
                  select: "id name profileImage",
                },
                {
                  path: "reciverId",
                  select: "id name profileImage",
                },
              ]);
            if (getMsg) {
              getMsg = getMsg.length > 0 ? getMsg[0] : getMsg;
              const get_socket_id = await Models.socketuser.findOne ({
                userId: data.reciverId,
              });
              if (get_socket_id) {
                io
                  .to (get_socket_id.socketId)
                  .emit ('send_message_emit', getMsg);
              }
  
              socket.emit("send_message_emit", getMsg);
              let user=await Models.userModel.findOne({
                _id:data.receiverId
              })
    
              if(user&&user.deviceToken){
                let deviceToken=user.deviceToken;
                let deviceType=user.deviceType;
                getMsg.deviceToken=deviceToken;
                getMsg.deviceType=deviceType;
                let datas={
                  getMsg,deviceToken,deviceType,chatType:1
                }
               await helper.sendPushToIosChat(datas)
              }
              // socket.emit ('send_message_emit', getMsg);
            }
          }
        }
      } catch (error) {
        throw error
      }
    });
    //Rename the group name
    socket.on("rename_group_name", async function (data) {
      try {
        let criteria={
          _id:data.groupId
        }
        let exits=await Models.groupChatModel.findOne(criteria);
        if(!exits){
          const success_message = {
            error: "No group found",
            code: 403,
          };
          socket.emit("rename_group_name_listener", success_message);
        }
        let objToSave = {
          groupName: data.groupName,
        };
        let reponse = await Models.groupChatModel.updateOne(criteria,objToSave);
        let success_msg = {
          success_msg: "Group name change successfully",
          reponse: reponse,
        };
        socket.emit("rename_group_name_listener", success_msg);
      } catch (error) {
        throw error
      }
    });
    //Remove from group
    socket.on("remove_from_group",async function (data){
      try {
        let criteria={
          _id:data.groupId
        }
        let groupChat = await Models.groupChatModel.findOne(criteria);

        if (!groupChat) {
          throw new Error("Group not found");
        }
        let exits=await Models.groupChatModel.findOne(criteria);
        if(exits.admin.toString()==data.removerId.toString()){
          let objToUpdate={
            admin:getRandomElement(exits.users),
            users:removeElementFromArray(exits.users,data.removerId)
          }
          let response=await Models.groupChatModel.findByIdAndUpdate({ _id : exits._id },{$set:{...objToUpdate}});
          let success_msg = {
            success_msg: "Remove form group successfully",
            reponse: response,
          };
          socket.emit("remove_from_group_listener", success_msg);
        }else{
          let objToUpdate={
            users:removeElementFromArray(exits.users,data.removerId)
          }
          let response=await Models.groupChatModel.findByIdAndUpdate({ _id : exits._id },{$set:{...objToUpdate}});
          let success_msg = {
            success_msg: "Remove form group successfully",
            reponse: response,
          };
          socket.emit("remove_from_group_listener", success_msg);
        }
      } catch (error) {
        throw error
      }
    });
    //add to group
    socket.on("add_in_group",async function (data){
        try {
          let criteria={
            _id:data.groupId
          }
          let groupChat = await Models.groupChatModel.findOne(criteria);
          if (!groupChat) {
            throw new Error("Group not found");
          }
          const update = {
            $addToSet: {
              users: data.userId,
            },
          };
      
          // Update the groupChat document
          const updatedGroupChat = await Models.groupChatModel.findByIdAndUpdate(
            data.groupId,
            update,
            { new: true } // This option returns the updated document
          );
      
          if (!updatedGroupChat) {
            throw new Error("Failed to update groupChat");
          }
          let response=await Models.groupChatModel.findOne(criteria);
          let success_msg = {
            success_msg: "Add into group successfully",
            reponse: response,
          };
          socket.emit("add_in_group_listener", success_msg);
        } catch (error) {
          throw error
        }
    });
    //read message
    socket.on("read_unread", async function (data) {
      try {
        if(data.groupId){
        let criteria={
          _id:data.messageId
        }
        let exits=await Models.groupChatModel.find(criteria)
        if(exits){
          let update=await Models.message.updateOne(
            { _id: data.messageId },
            {
              $addToSet: {
                groupMessage_read_by: data.senderId,
              },
            });
            const datas = { is_read: 1 };
            socket.emit("read_data_status", datas);
        }else{
          let data="Not group exist"
          socket.emit("read_data_status", data);
        }
        }else{
          const updateResult = await Models.message.updateMany(
            {
              _id:data.messageId,
              is_read: 0,
            },
            {
              $set: { is_read: 1 },
            }
          );
          const datas = { is_read: 1 };
          socket.emit("read_data_status", datas);
        }
      } catch (error) {
        throw error;
      }
    });
    //clear chat need senderId receiverId and group id if delete form group
    socket.on("clear_chat", async (get_data) => {
      try {
        if(get_data.groupId){
          //To update many records, adding the senderId to the groupMessage_clear array if the key doesn't exist, or checking if the senderId is not already in the array,
          await Models.message.updateMany(
            {
              $or: [
                { _id: get_data.groupId },
              ],
              $or: [
                { groupMessage_clear: { $exists: false } }, // If the key doesn't exist
                { groupMessage_clear: { $nin: [get_data.senderId] } }, // If the senderId is not in the array
              ],
            },
            { $addToSet: { groupMessage_clear: get_data.senderId } }
          );
          
           // Send success response to the client
        const success_message = {
          success_message: "Message clear successfully",
        };
        socket.emit("clear_chat_listener", success_message);
        }else{
        // Find the message to be clear
        const getMessage = await Models.message.find({
          $or: [
            { senderId: get_data.senderId },
            { reciverId: get_data.senderId },
          ],
          is_delete: { $exists: false },
        });
        if (getMessage) {
          // Update the message's deletedId if it exists
          await Models.message.updateMany(
            {
              $or: [
                { senderId: get_data.senderId },
                { reciverId: get_data.senderId },
              ],
              is_delete: { $exists: false },
            },
            { is_delete: get_data.senderId }
          );
        } else {
          // Delete the message if it doesn't exist or already marked as deleted
          await Models.message.deleteMany({
            $or: [
              { senderId: get_data.senderId },
              { reciverId: get_data.senderId },
            ],
            is_delete: { $ne: get_data.senderId },
          });
        }
        // Send success response to the client
        const success_message = {
          success_message: "Message clear successfully",
        };
        socket.emit("clear_chat_listener", success_message);
        }
      } catch (error) {
        throw error;
      }
    });
    //Lister for typing 
    socket.on('typing', (data) => {
      const { senderId, receiverId } = data;
      // Broadcast typing event to the receiver
      if(data.groupId){
        socket.to(data.groupId).emit('typing', senderId);
      }else{
        socket.to(receiverId).emit('typing', senderId);
      }
    });
    // Listen for stopTyping event
    socket.on('stopTyping', (data) => {
     const { senderId, receiverId } = data;
     // Broadcast stopTyping event to the receiver
     if(data.groupId){
       socket.to(data.groupId).emit('stopTyping', senderId);
      }else{
       socket.to(receiverId).emit('stopTyping', senderId);
     }
    });
    //Delete the message senderId and _id i.e msg id
    socket.on("delete_message", async (get_data) => {
        try {
          let deleteMessage;
          if (Array.isArray(get_data.id)) {
            // It's an array of IDs
            // deleteMessage = await Models.message.deleteMany({
            //   $or: [
            //     { senderId: get_data.senderId, _id: { $in: get_data.id } },
            //     { reciverId: get_data.senderId, _id: { $in: get_data.id } },
            //   ],
            // });
            deleteMessage = await Models.message.deleteOne({
              __id:get_data.messageId
              });
               //Find last message
               let lastMessage = await Models.chatconstant.findOne({
                $or: [
                  { senderId: get_data.senderId, lastmessage: { $in: get_data.id }},
                  { reciverId: get_data.senderId, lastmessage:{ $in: get_data.id }},
                ],
              });
              if (lastMessage) {
                //Then find last message
                let data = await Models.message.findOne(
                  {},
                  {},
                  { sort: { time: -1 } }
                );
                //Then store last message in chatConstant
                await Models.chatconstant.updateOne(
                  { _id: lastMessage._id },
                  { lastmessage: data._id, date: data.date, time: data.time }
                );
              }
                 // Send success response to the client
          const success_message = {
            success_message: "Message deleted successfully",
          };
          socket.emit("delete_message_listener", success_message);
          } else {
            // It's a single ID
            // deleteMessage = await Models.message.deleteOne({
            //   $or: [
            //     { senderId: get_data.senderId, _id: get_data.id },
            //     { reciverId: get_data.senderId, _id: get_data.id },
            //   ],
            // });
            deleteMessage = await Models.message.deleteOne({
            __id:get_data.messageId
            });
            //Find last message
            let lastMessage = await Models.chatconstant.findOne({
              $or: [
                { senderId: get_data.senderId, lastmessage: get_data.id },
                { reciverId: get_data.senderId, lastmessage: get_data.id },
              ],
            });
            if (lastMessage) {
              //Then find last message
              let data = await Models.message.findOne(
                {},
                {},
                { sort: { time: -1 } }
              );
              //Then store last message in chatConstant
              await Models.chatconstant.updateOne(
                { _id: lastMessage._id },
                { lastmessage: data._id, date: data.date, time: data.time }
              );
            }
          }
          // Send success response to the client
          const success_message = {
            success_message: "Message deleted successfully",
          };
          socket.emit("delete_message_listener", success_message);
        } catch (error) {
          throw error;
        }
    });
    socket.on("report_message",async(get_data)=>{
      try {
        let objToSave={
          senderId:get_data.senderId,
          reciverId:get_data.reciverId,
          message:get_data.message
       }
       let saveData=await Models.ReportModel.create(objToSave);
       socket.emit("report_message_listener", saveData);
      } catch (error) {
        throw error
      }
    });
    socket.on("read_notification",async(data)=>{
      try {
        await Models.eventNotificationModel.updateOne({_id:data._id},{$set:{is_read:1}});
        await Models.followingNotificationModel.updateOne({_id:data._id},{$set:{is_read:1}});
        let response=await Models.eventNotificationModel.find({_id:data._id})
        let result=await Models.followingNotificationModel.find({_id:data._id})
        let finalResult=response?response:result;
        let get_socket_id=await Models.socketuser.find({userId:data.userId})
        socket.emit("read_notification",finalResult)
        io.to(get_socket_id.socketId).emit("read_notification",finalResult)
      } catch (error) {
        throw error
      }
    });
    socket.on("unread_notification_count",async(data)=>{
      try {
        let eventNotification=await Models.eventNotificationModel.countDocuments({reciverId:data.userId,is_read:0})
        let followingNotification=await Models.followingNotificationModel.countDocuments({reciverId:data.userId,is_read:0})
        let unreadCount=parseInt(eventNotification)+parseInt(followingNotification)
        let get_socket_id=await Models.socketuser.find({userId:data.userId})
        socket.emit("unread_notification_count",{unreadCount:unreadCount})
        io.to(get_socket_id.socketId).emit("unread_notification_count",{unreadCount:unreadCount})
      } catch (error) {
        throw error
      }
    })
  });
};

//One to one chat
// Backend listerner - emmiter ===1.(connect_user,connect_user_listener), for connect user. 2.(users_chat_list,users_chat_list_listener), for seen single user all messsage
// 3.(user_constant_list,user_constant_chat_list),List of all user with whom sender-User do chat. 4(disconnect_user,disconnect_listener),for discount the user
// 5.(read_unread,read_data_status) for read or unread the message. 6 .(delete_message,delete_message_listener) delete permanetly message
// 7.(send_message,send_message_emit) for send the message. 8.(clear_chat,clear_chat_listener) for clear the chat. 9.(block_user,block_user_listener) for block the user
// 10.(report_message,report_message_listener) for report the user. 11(typing,typing) for typing 12.(stopTyping,stopTyping) for stop typing.


// For group chat steps
// 1. Create group need 
// {"adminId": "6482b949ecaba57ce0ed704d",
//  "groupUserIds": ["64f58472cc5a9a6f0a4722e3",
//  "64df1bf92bfbf73a614f8fd6","64ec33266529498d42412c7a"],
//  "groupName":"Event Group"
//  }
// 2 .send message
//     {
//       "senderId":"6482b949ecaba57ce0ed704d",
//      "groupUserIds": ["64f58472cc5a9a6f0a4722e3",
//      "64df1bf92bfbf73a614f8fd6","64ec33266529498d42412c7a"],
//     "message":"This is group message test",
//     "message_type":1,
//     "groupId":"6507dd0cd5bf981bfb2c2dde"
//      }

// 3 users_chat_list for group need
//   groupId and senderId

// 4 . rename_group_name    rename_group_name_listener
// groupId and groupName 
// 5 .remove_from_group
//  groupId and removerId if admin it self remove automatical rendom user will become admin

// 6 read_unread
// messageId and userId (who read the message)

// clear message
// senderId and groupId

// delete message 
// messageId and senderId