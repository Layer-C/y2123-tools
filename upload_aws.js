// Import required AWS SDK clients and commands for Node.js
const { DynamoDBClient, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');
const attr = require('dynamodb-data-types').AttributeValue;
const fs = require('fs');
const basePath = process.cwd();
// Set the AWS Region
const REGION = 'us-east-1';
const dbclient = new DynamoDBClient({ region: REGION });
const dynamoTableName = 'prod-metadata';

const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

// Create DynamoDB service object
const run = async () => {
  for (let i = 0; i < 500; i++) {
    try {
      let rawdata = fs.readFileSync(`${basePath}/metadata/${i}.json`);
      let json_data = JSON.parse(rawdata);
      const data = await insertToDynamoTable(json_data);
      console.log('Success, items inserted', data);
    } catch (err) {
      console.log('Error', err);
    }
    await sleep(0.5);
  }
};

// JSON - Insert to Dynamo Table
const insertToDynamoTable = async function (json) {
  try {
    let dynamoDBRecords = getDynamoDBRecords(json);
    var batches = [];

    while (dynamoDBRecords.length) {
      batches.push(dynamoDBRecords.splice(0, 25));
    }

    await callDynamoDBInsert(batches);
  } catch (error) {
    console.log(error);
    return error;
  }
};

const callDynamoDBInsert = async function (batches) {
  return Promise.all(
    batches.map(async (batch) => {
      requestItems = {};
      requestItems[dynamoTableName] = batch;

      var params = {
        RequestItems: requestItems,
      };

      await dbclient.send(new BatchWriteItemCommand(params));
    })
  );
};

// Get DynamoDB records from json
const getDynamoDBRecords = function (data) {
  let dynamoDBRecords = [data].map((entity) => {
    entity = attr.wrap(entity);
    console.log(entity);
    let dynamoRecord = Object.assign({ PutRequest: { Item: entity } });
    return dynamoRecord;
  });

  return dynamoDBRecords;
};

run();
