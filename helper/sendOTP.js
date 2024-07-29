const nodemailer = require("nodemailer");
const SendOtp = async (email, otp, name) => {
console.log("otp",otp)
console.log("name",name)
  //   console.log("email", email);

  // Sending Otp to phone number
  // const accountSid = process.env.TWILIO_ACCOUNT_SID;
  // const authToken = process.env.TWILIO_AUTH_TOKEN;
  // const phone_no = process.env.TWILIO_PHONE_NUMBER;
  // const client = twilio(accountSid, authToken);

  // if (number) {
  //   console.log('+=====+++++++++++++++++++++++',number)
  //   await client.messages
  //     .create({
  //       body: `Your Otp is ${otp}`,
  //       from: phone_no,
  //       to: number,
  //     })
  //     .then((message) => console.log(message.sid))
  //     .done();
  // }

  // console.log("result", result);

  // Sending Otp to email
  var transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Otp",
    html: `<div><span>Hello ${name}</span>
    <br /><br />
    <span>
      Thank you for choosing Evento App. Use the following OTP to complete your
      Forget Password procedures.
    </span>
    <br /><br />
    <b>${otp}</b>
    <br /><br />
    <span>If you didn’t request this, you can ignore this email.</span>
    <br /><br />
    <br /><br />
    <span>
      Regards,<br />
      Evento App
    </span></div>`,
  };
  if (email) {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      console.log("Otp sent your email:", info.messageId, info.response);
    });
  }
};

module.exports = SendOtp;
