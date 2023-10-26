const express = require("express");

const app = express();

const path = require("path");

const fs = require("fs");

const axios = require("axios");

const bodyParser = require("body-parser");

const mysql = require("mysql2");

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
// route to stkpush.js
app.post("/api/stkpush", (req, res) => {
  let phoneNumber = req.body.phoneNumber;
  let amount = req.body.amount;

  // Extract phone number and amount from query parameters if not found in the request body
  if (!phoneNumber || !amount) {
    const { phoneNumber: queryPhoneNumber, amount: queryAmount } = req.query;
    if (queryPhoneNumber && queryAmount) {
      phoneNumber = queryPhoneNumber;
      amount = queryAmount;
    } else {
      return res.status(400).json({
        status: "error",
        message: "Both phone number and amount are required."
      });
    }
  }

  const { spawn } = require("child_process");
  const child = spawn("node", ["stkpush.js", phoneNumber, amount]);

  let output = "";
  let errorOutput = ""; // Capture error output

  child.stdout.on("data", (data) => {
    output += data.toString();
    console.log(`stdout:\n${data}`);
  });

  child.stderr.on("data", (data) => {
    errorOutput += data.toString(); // Capture error output
    console.error(`stderr:\n${data}`);
  });

  child.on("close", (code) => {
    console.log(`stkpush.js exited with code ${code}`);

    if (code === 0) {
      const jsonResponse = {
        status: "success",
        message: "stkpush.js executed successfully",
        output: output.split(":")[0]
      };
      res.status(200).json(jsonResponse);
    } else {
      const jsonResponse = {
        status: "error",
        message: `stkpush.js exited with code ${code}`,
        errorOutput: errorOutput.split(":")[2].split("\n")[0],
        time: new Date().toLocaleString()
      };
      res.status(500).json(jsonResponse);
    }
  });
});

// route to callback.js
app.post("/api/callback", (req, res) => {
  // Assuming the request body contains the JSON data from the incoming POST request
  const content = req.body;

  // Retrieve the token from the query parameter (equivalent to Laravel's $request->fullUrl())
  const token = req.query.token;

  // Read the existing JSON data from the file, or initialize an empty array
  let existingData = [];

  try {
    const rawData = fs.readFileSync("callback.json");
    existingData = JSON.parse(rawData);
  } catch (error) {
    console.error(error);
  }

  // Append the new data to the existing data
  existingData.push({
    token,
    content
  });

  // Write the updated data to the file
  try {
    fs.writeFileSync("callback.json", JSON.stringify(existingData));
  } catch (error) {
    console.error(error);
  }

  // Send a success response to the caller

  const jsonResponse = {
    status: "success",
    message: "Callback data received successfully",
    data: {
      token,
      content
    }
  };
  res.status(200).json(jsonResponse);
});

// route to read from stk_push_result
app.get("/api/stkpush/result", (req, res) => {
  //read from stk_push_result.json
  const content = fs.readFileSync("callback.json", "utf8");
  const jsonResponse = {
    status: "success",
    message: "callback.json read successfully",
    data: JSON.parse(content)
  };
  res.status(200).json(jsonResponse);
});

//server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
