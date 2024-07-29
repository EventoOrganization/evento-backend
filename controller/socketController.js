
let saveMessage=async(data)=>{
    try {
      console.log("this is data",data)
      return true;
      let checkChatConstant = await Models.chatconstant.findOne({
        $or: [
          { senderId: req.body.senderId, reciverId: req.body.reciverId },
          { senderId: req.body.reciverId, reciverId: req.body.senderId },
        ],
      });
      let messages;
      if(req.body.message_type==1){
        messages=req.body.message
      }else if(req.body.message_type==3){
        if (req.files && req.files.video) {
          const video = req.files.video;
          messages = await helper.fileUpload(video, 'videos');
          
          await new Promise((resolve, reject) => {
            ffmpeg(`${process.cwd()}/public/images/videos/${messages}`)
              .screenshots({
                timestamps: ['05%'],
                filename: `${messages}thumbnail.jpg`,
                folder: `${process.cwd()}/public/images/videos/`,
                size: '320x240',
              })
              .on('end', () => {
                console.log(`Thumbnail generated for ${messages}`);
                resolve();
              })
              .on('error', (err) => {
                console.error(`Error generating thumbnail for ${messages}:`, err);
                reject(err);
              });
          });
          var thumbnail = `${messages}thumbnail.jpg`;
        }
      }else if(req.body.message_type==2){
        if (req.files && req.files.images) {
          messages= await helper.fileUpload(image, 'profile');
        }
      }

      if (checkChatConstant) {
        let saveMsg = await Models.message.create({
          senderId: req.body.senderId,
          reciverId: req.body.reciverId,
          message: messages,
          message_type: req.body.message_type,
          constantId: checkChatConstant.id,
        });
  
        await Models.chatconstant.updateOne(
          { _id: checkChatConstant._id },
          { lastmessage: saveMsg._id }
        );
  
        let getMsg = await Models.message.findOne({
          senderId: saveMsg.senderId,
          reciverId: saveMsg.reciverId,
          _id: saveMsg._id,
        }).populate([
          {
            path: 'sender_details',
            select: 'id name images',
          },
          {
            path: 'reciever_details',
            select: 'id name images',
          },
        ]);
       return getMsg;
      } else {
        let createChatConstant = await Models.chatconstant.create({
          senderId: req.body.senderId,
          reciverId: req.body.reciverId,
        });
  
        let saveMsg = await Models.message.create({
          senderId: req.body.senderID,
          reciverId: req.body.receiverID,
          message: messages,
          message_type: req.body.message_type,
          constantId: createChatConstant._id,
        });
  
        await Models.chatconstant.updateOne(
          { _id: createChatConstant._id },
          { lastmessage: saveMsg._id }
        );
  
        let getMsg = await Models.message.findOne({
          senderId: saveMsg.senderId,
          reciverId: saveMsg.reciverId,
          _id: saveMsg._id,
        }).populate([
          {
            path: 'sender_details',
            select: 'id name images',
          },
          {
            path: 'reciever_details',
            select: 'id name images',
          },
        ]);
      return getMsg
      }
    } catch (error) {
      console.error(error);
    }
  }
  module.exports = saveMessage;