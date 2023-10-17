const axios = require("axios");
const fs = require("fs");

//read data from keys.json
const keys = JSON.parse(fs.readFileSync("keys.json", "utf-8"));

//aplly destructuring to keys object
const consumerKey = keys.consumerKey;
const consumerSecret = keys.consumerSecret;
const businessShortCode = keys.businessShortCode;
const passkey = keys.passkey;
const phoneNumber = keys.phoneNumber;
const callbackUrl = keys.callbackUrl;
const amount = keys.amount;
const customerName = keys.customerName;
const authorizationUrl = keys.authorizationUrl;
const stkPushUrl = keys.stkPushUrl;

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
    TransactionDesc: "Testing stk push on sandbox"
  };

  try {
    const response = await axios.post(stkPushUrl, requestData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    });

    console.log(response.data);

    if (response.data.ResponseCode) {
      return response.data.ResponseCode;
    } else {
      return "ResponseCode not found in the response";
    }
  } catch (error) {
    console.error("An error occurred:", error);
    return "Invalid JSON response";
  }
}

stkPush();
