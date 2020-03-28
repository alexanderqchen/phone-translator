const { accountSid, authToken } = require("./config.js");
const client = require("twilio")(accountSid, authToken);

client.messages
  .create({
    body: "This is the ship that made the Kessel Run in fourteen parsecs?",
    to: "+17134098344",
    from: "+14133411614"
  })
  .then(message => console.log(message.sid));
