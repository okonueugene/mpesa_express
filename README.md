# Mpesa Express STK Push Request

This repository provides a simple STK Push request implementation using the Safaricom Mpesa Express Sandbox API. It allows you to initiate secure mobile money transactions. The service can be accessed via the following URL: `host:3000/api/stkpush`.

## Prerequisites

Before you can use this STK Push request service, make sure you have the following prerequisites in place:

1. A working Mpesa Express Sandbox account.
2. A registered Safaricom developer account for API access.

You will have to acquire the following credentials from your Safaricom developer account:

```json
{
  "consumerKey": "YOUR_CONSUMER_KEY",
  "consumerSecret": "YOUR_CONSUMER_SECRET",
  "businessShortCode": "YOUR_BUSINESS_SHORT_CODE",
  "passkey": "YOUR_PASSKEY",
  "phoneNumber": "YOUR_PHONE_NUMBER",
  "amount": "YOUR_AMOUNT",
  "callbackUrl": "YOUR_CALLBACK_URL"
}
```

## Installation

To get started, follow these steps:

1. Download the ZIP file for this project and extract it to your desired location or clone the repository using the following command:

```bash
git clone https://github.com/okonueugene/mpesa_express.git
```

2. Navigate to the project directory and install the required dependencies using the following command:

```bash
npm install
```

3.Run the application using the following command:

```bash
npm start
```

it will run on port 3000

## Usage

You can easily use the STK Push request by making a POST request to the following URL: `host:3000/api/stkpush`. Provide the necessary input parameters in the JSON body or parameter as follows:

```json
{
  "phoneNumber": "YOUR_PHONE_NUMBER",
  "amount": "YOUR_AMOUNT"
}
```
