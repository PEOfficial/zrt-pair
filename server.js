// server.js

const express = require("express");
const cors = require("cors");
const pino = require("pino");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

let sock;

async function startBot() {

  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  const { version } =
    await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: ["DRAXEN-AI", "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async(update) => {

    const {
      connection,
      lastDisconnect
    } = update;

    if(connection === "close") {

      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log("Connection closed");

      if(shouldReconnect) {
        startBot();
      }

    }

    if(connection === "open") {
      console.log("WhatsApp connected");
    }

  });

}

startBot();


// HOME ROUTE

app.get("/", (req, res) => {

  res.send(`
    <h2>ZEROTRACE-MD Backend Running ✅</h2>
  `);

});


// PAIRING ROUTE

app.get("/pair", async(req, res) => {

  try {

    let number = req.query.number;

    if(!number) {

      return res.json({
        status: false,
        error: "Phone number required"
      });

    }

    number = number.replace(/[^0-9]/g, "");

    const code =
      await sock.requestPairingCode(number);

    return res.json({
      status: true,
      code
    });

  } catch(err) {

    console.log(err);

    return res.json({
      status: false,
      error: "Failed to generate pairing code"
    });

  }

});


app.listen(PORT, () => {

  console.log(`
    Server running on port ${PORT}
  `);

});