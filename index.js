const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const VoiceResponse = require("twilio").twiml.VoiceResponse;
const { accountSid, authToken } = require("./config.js");
const client = require("twilio")(accountSid, authToken);
const { Translate } = require("@google-cloud/translate").v2;

const gl1 = "en";
const gl2 = "es";
// const gl2 = "fr";
const tl1 = "en-US";
// const tl2 = "fr-FR";
const tl2 = "es-MX";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

process.env.GOOGLE_APPLICATION_CREDENTIALS =
  "./phone-translator-55e02993bd2f.json";
const translate = new Translate();

const twilioNumber = "+15054126310";

let toNumber;
let callAnswered;

let recordingInitiated1 = false;
let recordingFinished1 = false;
let transcription1;

let recordingInitiated2 = false;
let recordingFinished2 = false;
let transcription2;

let turn = 1;

const gatherPhoneNumber = twiml => {
  const gather = twiml.gather({ numDigits: 10 });
  gather.say("What phone number would you like to call?");
  twiml.say("Connecting you right now.");
};

const receiveCall = twiml => {
  twiml.redirect("https://764009ce.ngrok.io/voice");
};

const recordSentence = twiml => {
  const gather = twiml.gather({
    input: "speech",
    action: "/handle",
    finishOnKey: "*",
    language: turn === 1 ? tl1 : tl2
  });
  gather.say("What do you want to say?");

  // twiml.say("What do you want to say?");
  // twiml.record({
  //   transcribe: true,
  //   transcribeCallback: "/handle",
  //   finishOnKey: "*"
  // });
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

app.post("/voice", (req, res) => {
  const twiml = new VoiceResponse();

  if (req.body.Called === "+1" + toNumber) {
    // callee
    if (!callAnswered) {
      twiml.pause({ length: 3 });
      twiml.say("Connected to call");
      twiml.redirect("/voice");
      callAnswered = true;
    } else if (turn !== 2) {
      twiml.say("Waiting for a response.");
      twiml.pause({ length: 5 });
      twiml.redirect("/voice");
    } else if (transcription1 !== undefined) {
      twiml.say({ language: tl2 }, transcription1);
      twiml.redirect("/voice");
      transcription1 = undefined;
    } else if (!recordingInitiated2) {
      recordingInitiated2 = true;
      recordSentence(twiml);
    } else if (!recordingFinished2) {
      twiml.say("Wait a moment while your response is being processed.");
      twiml.pause({ length: 5 });
      twiml.redirect("/voice");
    } else {
      if (transcription2 === undefined) {
        twiml.say("Sorry I did not understand you.");
        twiml.redirect("/voice");
        recordingInitiated2 = false;
        recordingFinished2 = false;
      } else {
        twiml.say("Sending your message. Please wait.");
        twiml.pause({ length: 5 });
        twiml.redirect("/voice");
        recordingInitiated2 = false;
        recordingFinished2 = false;
        turn = 1;
      }
    }
  } else {
    // caller
    if (turn !== 1) {
      twiml.say("Waiting for a response.");
      twiml.pause({ length: 5 });
      twiml.redirect("/voice");
    } else if (transcription2 !== undefined) {
      twiml.say({ language: tl1 }, transcription2);
      twiml.redirect("/voice");
      transcription2 = undefined;
    } else if (!recordingInitiated1) {
      recordingInitiated1 = true;
      recordSentence(twiml);
    } else if (!recordingFinished1) {
      twiml.say("Wait a moment while your response is being processed.");
      twiml.pause({ length: 5 });
      twiml.redirect("/voice");
    } else {
      if (transcription1 === undefined) {
        twiml.say("Sorry I did not understand you.");
        twiml.redirect("/voice");
        recordingInitiated1 = false;
        recordingFinished1 = false;
      } else {
        twiml.say("Sending your message. Please wait.");
        twiml.pause({ length: 5 });
        twiml.redirect("/voice");
        recordingInitiated1 = false;
        recordingFinished1 = false;
        turn = 2;
      }
    }
  }

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

app.post("/handle", async (req, res) => {
  if (req.body.Called === "+1" + toNumber) {
    recordingFinished2 = true;
    preTranslate = req.body.SpeechResult;

    try {
      const [translation] = await translate.translate(preTranslate, {
        from: gl2,
        to: gl1
      });
      console.log("Transcription: " + preTranslate);
      console.log("Translation: " + translation);
      transcription2 = translation;
    } catch (e) {
      console.log(e);
    }
  } else {
    recordingFinished1 = true;
    preTranslate = req.body.SpeechResult;

    try {
      const [translation] = await translate.translate(preTranslate, {
        from: gl1,
        to: gl2
      });
      console.log("Transcription: " + preTranslate);
      console.log("Translation: " + translation);
      transcription1 = translation;
    } catch (e) {
      console.log(e);
    }
  }

  const twiml = new VoiceResponse();
  twiml.redirect("/voice");
  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

http.createServer(app).listen(1337, () => {
  console.log("Express server listening on port 1337");
});
