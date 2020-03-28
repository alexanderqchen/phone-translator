const { accountSid, authToken } = require("./config.js");
const client = require("twilio")(accountSid, authToken);

client.messages
  .create({
    body: "This is the ship that made the Kessel Run in fourteen parsecs?",
    from: "+14133411614",
    to: "+15104176801"
  })
  .then(message => console.log(message.sid))
  .catch(e => console.log(e));
