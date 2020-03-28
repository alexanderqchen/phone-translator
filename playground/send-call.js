const { accountSid, authToken } = require("../config.js");
const client = require("twilio")(accountSid, authToken);

client.calls
  .create({
    twiml: "<Response><Say>Ahoy, World!</Say></Response>",
    to: "+17134098344",
    from: "+14133411614"
  })
  .then(call => console.log(call.sid));
