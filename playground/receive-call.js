const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const VoiceResponse = require("twilio").twiml.VoiceResponse;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const gatherPhoneNumber = twiml => {
  const gather = twiml.gather({ numDigits: 10 });
  gather.say("What phone number would you like to call?");
  twiml.redirect("/voice");
};

const recordName = twiml => {
  twiml.say("What is your name?");
  twiml.record({
    transcribe: true,
    transcribeCallback: "/voice",
    finishOnKey: "*"
  });
};

app.post("/voice", (req, res) => {
  const twiml = new VoiceResponse();

  // if (req.body.Digits === undefined) {
  //   gatherPhoneNumber(twiml);
  // }
  console.log("in /voice");

  if (req.body.TranscriptionText === undefined) {
    recordName(twiml);
  }

  console.log(`Hello, ${req.body.TranscriptionText}`);

  // const toNumber = req.body.Digits;

  // twiml.say(`The phone number you entered is ${req.body.Digits}`);

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

app.post("/handle", (req, res) => {
  console.log(req.body.TranscriptionText);
});

http.createServer(app).listen(1337, () => {
  console.log("Express server listening on port 1337");
});
