process.env.GOOGLE_APPLICATION_CREDENTIALS =
  "../phone-translator-55e02993bd2f.json";

const { Translate } = require("@google-cloud/translate").v2;

// Creates a client
const translate = new Translate();

const text = "Hello, how are you?";
const target = "es";

let [translation] = await translate.translate(text, target);
console.log(translation);
