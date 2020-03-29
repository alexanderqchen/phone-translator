const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const VoiceResponse = require("twilio").twiml.VoiceResponse;
const { accountSid, authToken } = require("./config.js");
const client = require("twilio")(accountSid, authToken);
const { Translate } = require("@google-cloud/translate").v2;

const gl1 = "es";
const gl2 = "fr";
const tl1 = "es-MX";
const tl2 = "fr-FR";
const tlg2 = "fr-FR";

const MESSAGE_GET_NUMBER = "What phone number would you like to call?";
const MESSAGE_GET_NUMBER_DONE = "Connecting you right now.";
const MESSAGE_GET_SENTENCE = "What do you want to say?";
const MESSAGE_CONNECTED = "Connected to call";
const MESSAGE_WAIT_RESPONSE = "Waiting for a response.";
const MESSAGE_WAIT_PROCESSING =
  "Wait a moment while your response is being processed.";
const MESSAGE_DONT_UNDERSTAND = "Sorry I did not understand you.";
const MESSAGE_SENDING = "Sending your message. Please wait.";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

process.env.GOOGLE_APPLICATION_CREDENTIALS =
  "./phone-translator-55e02993bd2f.json";
let translate = new Translate();

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

const SayMessage = async (twiml, language, message) => {
  try {
    if (language !== "en-US") {
      if (language === tl1) {
        [message] = await translate.translate(message, gl1);
      } else {
        [message] = await translate.translate(message, gl2);
      }
    }

    twiml.say({ language }, message);
  } catch (e) {
    console.log(e);
  }
};

const Gather = (twiml, language) => {
  return twiml.gather({
    input: "speech",
    action: "/handle",
    finishOnKey: "*",
    language: language
  });
};

const receiveCall = twiml => {
  twiml.redirect("https://bc1f9cd8.ngrok.io/voice");
};

const gatherPhoneNumber = async twiml => {
  try {
    const gather = twiml.gather({ numDigits: 10 });
    await SayMessage(gather, tl1, MESSAGE_GET_NUMBER);
    await SayMessage(twiml, tl1, MESSAGE_GET_NUMBER_DONE);
  } catch (e) {
    console.log(e);
  }
};

const recordSentence = async twiml => {
  try {
    if (turn === 1) {
      const gather = Gather(twiml, tl1);
      await SayMessage(gather, tl1, MESSAGE_GET_SENTENCE);
    } else {
      const gather = Gather(twiml, tlg2);
      await SayMessage(gather, tl2, MESSAGE_GET_SENTENCE);
    }
  } catch (e) {
    console.log(e);
  }
};

app.post("/initiate", async (req, res) => {
  const twiml = new VoiceResponse();

  if (req.body.Digits !== undefined) {
    toNumber = req.body.Digits;
  }

  if (toNumber === undefined) {
    await gatherPhoneNumber(twiml);
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

app.post("/voice", async (req, res) => {
  try {
    const twiml = new VoiceResponse();

    if (req.body.Called === "+1" + toNumber) {
      // callee
      if (!callAnswered) {
        twiml.pause({ length: 3 });
        await SayMessage(twiml, tl2, MESSAGE_CONNECTED);
        twiml.redirect("/voice");
        callAnswered = true;
      } else if (turn !== 2) {
        await SayMessage(twiml, tl2, MESSAGE_WAIT_RESPONSE);
        twiml.pause({ length: 5 });
        twiml.redirect("/voice");
      } else if (transcription1 !== undefined) {
        twiml.say({ language: tl2 }, transcription1);
        twiml.redirect("/voice");
        transcription1 = undefined;
      } else if (!recordingInitiated2) {
        recordingInitiated2 = true;
        await recordSentence(twiml);
      } else if (!recordingFinished2) {
        await SayMessage(twiml, tl2, MESSAGE_WAIT_PROCESSING);
        twiml.pause({ length: 5 });
        twiml.redirect("/voice");
      } else {
        if (transcription2 === undefined) {
          await SayMessage(twiml, tl2, MESSAGE_DONT_UNDERSTAND);
          twiml.redirect("/voice");
          recordingInitiated2 = false;
          recordingFinished2 = false;
        } else {
          await SayMessage(twiml, tl2, MESSAGE_SENDING);
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
        await SayMessage(twiml, tl1, MESSAGE_WAIT_RESPONSE);
        twiml.pause({ length: 5 });
        twiml.redirect("/voice");
      } else if (transcription2 !== undefined) {
        twiml.say({ language: tl1 }, transcription2);
        twiml.redirect("/voice");
        transcription2 = undefined;
      } else if (!recordingInitiated1) {
        recordingInitiated1 = true;
        await recordSentence(twiml);
      } else if (!recordingFinished1) {
        await SayMessage(twiml, tl1, MESSAGE_WAIT_PROCESSING);
        twiml.pause({ length: 5 });
        twiml.redirect("/voice");
      } else {
        if (transcription1 === undefined) {
          await SayMessage(twiml, tl1, MESSAGE_DONT_UNDERSTAND);
          twiml.redirect("/voice");
          recordingInitiated1 = false;
          recordingFinished1 = false;
        } else {
          await SayMessage(twiml, tl1, MESSAGE_SENDING);
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
  } catch (e) {
    console.log(e);
  }
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
