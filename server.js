const express = require("express");

const app = express();

const path = require("path");

const fs = require("fs");

const axios = require("axios");

const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
// route to stkpush.js
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
app.get("/api/callback", (req, res) => {
  const { spawn } = require("child_process");
  const child = spawn("node", ["callback.js"]);

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
    console.log(`callback.js exited with code ${code}`);

    if (code === 0) {
      const jsonResponse = {
        status: "success",
        message: "callback.js executed successfully",
        output: output.split(":")[0]
      };
      res.status(200).json(jsonResponse);
    } else {
      const jsonResponse = {
        status: "error",
        message: `callback.js exited with code ${code}`,
        errorOutput: errorOutput.split(":")[2].split("\n")[0],
        time: new Date().toLocaleString()
      };
      res.status(500).json(jsonResponse);
    }
  });
});

// route to read from stk_push_result
app.get("/api/stkpush/result", (req, res) => {
  //read from stk_push_result.json
  const content = fs.readFileSync("stk_push_result.json", "utf8");
  const jsonResponse = {
    status: "success",
    message: "stk_push_result.json read successfully",
    data: JSON.parse(content)
  };
  res.status(200).json(jsonResponse);
});

//server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
