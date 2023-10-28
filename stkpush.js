const axios = require("axios");
const fs = require("fs");
const winston = require("winston");

const env = JSON.parse(fs.readFileSync("env.json", "utf-8"));

const {
  consumerKey,
  consumerSecret,
  businessShortCode,
  passkey,
  callbackUrl,
  customerName,
  authorizationUrl,
  stkPushUrl
} = env;

// Create a logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf((info) => {
      return `${info.timestamp} ${info.level}: ${info.message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" })
  ]
});

// Validate and format the request data
function validateRequestData(requestData) {
  const requiredFields = [
    "BusinessShortCode",
    "Password",
    "Timestamp",
    "TransactionType",
    "Amount",
    "PartyA",
    "PartyB",
    "PhoneNumber",
    "CallBackURL",
    "AccountReference",
    "TransactionDesc"
  ];

  for (const field of requiredFields) {
    if (!requestData.hasOwnProperty(field)) {
      logger.error(`Missing required field: ${field}`);
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (isNaN(requestData.Amount)) {
    logger.error("Amount must be a number");
    throw new Error("Amount must be a number");
  } else if (requestData.Amount < 1 || requestData.Amount > 500000) {
    logger.error("Amount must be between 1 and 500000");
    throw new Error("Amount must be between 1 and 500000");
  }

  if (!requestData.PhoneNumber.match(/^2547\d{8}$/)) {
    logger.error("Invalid phone number. The correct format is 2547XXXXXXXX");
    throw new Error("Invalid phone number. The correct format is 2547XXXXXXXX");
  }

  if (requestData.PhoneNumber.lenght > 12) {
    logger.error("Invalid phone number. Too Many digits");
    console.error("Invalid phone number. Too Many digits");
  } else if (requestData.PhoneNumber.lenght < 12) {
    logger.error("Invalid phone number. Too few digits");
    console.error("Invalid phone number. Too few digits");
  }
}

async function generateAccessToken() {
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    "base64"
  );

  try {
    const response = await axios.get(authorizationUrl, {
      headers: {
        Authorization: `Basic ${credentials}`
      }
    });
    return response.data.access_token;
  } catch (error) {
    logger.error("Error generating access token:", error);
    throw new Error("Error generating access token: " + error);
  }
}

function handleResponse(response) {
  if (response.data.ResponseCode) {
    if (response.data.ResponseCode === "0") {
      logger.info(
        "STK push was successful" +
          " " +
          new Date().toLocaleString("en-US", {
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: true
          })
      );
      console.log(
        "STK push was successful" +
          " " +
          new Date().toLocaleString("en-US", {
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: true
          })
      );
    } else {
      logger.error("STK push failed with code:", response.data);
      console.error("STK push failed with code:", response.data);
      process.exit(1);
    }
  } else {
    logger.error("ResponseCode not found in the response");
    console.error("ResponseCode not found in the response");
    process.exit(1);
  }
}

async function stkPush() {
  try {
    const accessToken = await generateAccessToken();
    const password = Buffer.from(
      `${businessShortCode}${passkey}${new Date()
        .toISOString()
        .replace(/[-:.T]/g, "")
        .slice(0, 14)}`
    ).toString("base64");

    const requestData = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: new Date()
        .toISOString()
        .replace(/[-:.T]/g, "")
        .slice(0, 14),
      TransactionType: "CustomerPayBillOnline",
      Amount: process.argv[3], // Using amount from command line arguments
      PartyA: process.argv[2], // Using phone number from command line arguments
      PartyB: businessShortCode,
      PhoneNumber: process.argv[2], // Using phone number from command line arguments
      CallBackURL: callbackUrl,
      AccountReference: customerName,
      TransactionDesc: "Testing STK push on sandbox"
    };

    validateRequestData(requestData);

    const response = await axios.post(stkPushUrl, requestData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    });

    handleResponse(response);
  } catch (error) {
    logger.error("An error occurred:", error);
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

stkPush();
