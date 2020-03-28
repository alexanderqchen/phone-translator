const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const MessagingResponse = require("twilio").twiml.MessagingResponse;
const { Translate } = require("@google-cloud/translate").v2;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const { accountSid, authToken } = require("./config.js");
const client = require("twilio")(accountSid, authToken);

process.env.GOOGLE_APPLICATION_CREDENTIALS =
  "./phone-translator-55e02993bd2f.json";
const translate = new Translate();

app.post("/sms", async (req, res) => {
  const text = req.body.Body;
  const lines = text.split("\n");

  const toNumber = lines[0];
  lines.shift();
  const message = lines.join("\n");

  try {
    let [translation] = await translate.translate(message, "es");

    await client.messages.create({
      body: translation,
      from: "+14133411614",
      to: toNumber
    });
  } catch (e) {
    console.log(e);
  }

  const twiml = new MessagingResponse();
  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

http.createServer(app).listen(1337, () => {
  console.log("Express server listening on port 1337");
});
