const axios = require("axios");
const fs = require("fs");

// Read data from keys.json
const keys = JSON.parse(fs.readFileSync("keys.json", "utf-8"));

// Apply destructuring to keys object
const {
  consumerKey,
  consumerSecret,
  businessShortCode,
  passkey,
  phoneNumber,
  callbackUrl,
  amount,
  customerName,
  authorizationUrl,
  stkPushUrl
} = keys;

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

    const accessToken = response.data.access_token;
    return accessToken;
  } catch (error) {
    console.error("Error generating access token:", error);
    throw error;
  }
}

async function validateRequestData(requestData) {
  // Check if all required fields are present
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
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Check if the amount is valid
  if (isNaN(requestData.Amount) || requestData.Amount < 1) {
    throw new Error("Invalid amount");
  }

  // Check if the phone number is in the correct format (254XXXXXXXXX)
  if (!requestData.PhoneNumber.match(/^2547\d{8}$/)) {
    throw new Error("Invalid phone number");
  } else {
    //format phone number to 2547XXXXXXXX
    requestData.PhoneNumber = requestData.PhoneNumber.replace(/^07/, "2547");
  }
}

async function handleResponse(response) {
  if (response.data.ResponseCode) {
    // Check if the response code is a success
    if (response.data.ResponseCode === "0") {
      console.log(
        "STK push was successful:",
        response.data.ResponseDescription
      );
    } else {
      console.error("STK push failed with code:", response.data.ResponseCode);
    }
  } else {
    console.error("ResponseCode not found in the response");
  }
}

async function stkPush() {
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
    Amount: amount,
    PartyA: phoneNumber,
    PartyB: businessShortCode,
    PhoneNumber: phoneNumber,
    CallBackURL: callbackUrl,
    AccountReference: customerName,
    TransactionDesc: "Testing STK push on sandbox"
  };

  try {
    await validateRequestData(requestData);

    const response = await axios.post(stkPushUrl, requestData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    });

    handleResponse(response);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

stkPush();
