const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const VoiceResponse = require("twilio").twiml.VoiceResponse;
const { accountSid, authToken } = require("./config.js");
const client = require("twilio")(accountSid, authToken);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const twilioNumber = "+15054126310";

let toNumber;
let fromNumber;
let callAnswered;

let recordingInitiated1 = false;
let recordingFinished1 = false;
let transcription1;

let recordingInitiated2 = false;
let recordingFinished2 = false;
let transcription2;

const gatherPhoneNumber = twiml => {
  const gather = twiml.gather({ numDigits: 10 });
  gather.say("What phone number would you like to call?");
  twiml.say("Connecting you right now.");
};

const receiveCall = twiml => {
  twiml.redirect("https://764009ce.ngrok.io/voice");
};

const recordName = twiml => {
  twiml.say("What is your name?");
  twiml.record({
    transcribe: true,
    transcribeCallback: "/handle",
    finishOnKey: "*"
  });
};

app.post("/initiate", async (req, res) => {
  const twiml = new VoiceResponse();

  if (req.body.Digits !== undefined) {
    toNumber = req.body.Digits;
  }

  if (toNumber === undefined) {
    gatherPhoneNumber(twiml);
  } else if (!callAnswered) {
    try {
      const twiml2 = new VoiceResponse();
      receiveCall(twiml2);

      await client.calls.create({
        twiml: twiml2.toString(),
        to: toNumber,
        from: twilioNumber
      });
    } catch (e) {
      console.log(e);
    }
    twiml.redirect("/voice");
  }

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

app.post("/test", (req, res) => {
  const twiml = new VoiceResponse();
  twiml.say("it works");

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

app.post("/voice", (req, res) => {
  const twiml = new VoiceResponse();

  console.log(req.body.Called);
  console.log(toNumber);

  if (req.body.Called === "+1" + toNumber) {
    twiml.pause({ length: 3 });
    twiml.say("I'm watching you.");
  } else {
    twiml.say("You weren't supposed to hear this.");
  }

  // if (!recordingInitiated1) {
  //   recordingInitiated1 = true;
  //   recordName(twiml);
  // } else if (!recordingFinished1) {
  //   twiml.say("Wait a moment while your response is being processed.");
  //   twiml.pause({ length: 10 });
  //   twiml.redirect("/voice");
  // } else {
  //   if (transcription1 === undefined) {
  //     twiml.say("Sorry I did not understand you.");
  //     twiml.redirect("/voice");
  //     recordingInitiated1 = false;
  //     recordingFinished1 = false;
  //   } else {
  //     twiml.say(transcription1);
  //     toNumber = undefined;
  //     recordingInitiated1 = false;
  //     recordingFinished1 = false;
  //     transcription1 = undefined;
  //   }
  // }

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

app.post("/handle", (req, res) => {
  recordingFinished1 = true;
  transcription1 = req.body.Transcription1Text;
});

http.createServer(app).listen(1337, () => {
  console.log("Express server listening on port 1337");
});
