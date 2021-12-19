#!/usr/bin/env node

//IMPORTS
const fs = require('fs');
const { writeFile } = require("fs").promises;

//SETTINGS
let metaData = {};
let config = {
  metaData: {
    name: 'Y2123',
    description: '[Y2123](https://www.y2123.com)',
    image: 'https://gateway.pinata.cloud/ipfs/QmNkDzVksNs7K32srQqE45qVKUA3zcntXNBR6A3TAq6vAM/placeholder1.png'
  }
};
let metadata_output_dir = process.cwd() + '/metadata/';

writeMetadata();

function generateMetadataObject(id) {
  metaData[id] = {
    name: config.metaData.name + '#' + id,
    description: config.metaData.description,
    image: config.metaData.image,
    attributes: [{
      "trait_type": "Type",
      "value": "Genesis - Explorer"
    }],
  };
}

async function writeMetadata() {
  for (let i = 0; i < 500; i++) {
    generateMetadataObject(i);
  }
  if (!fs.existsSync(metadata_output_dir)) {
    fs.mkdirSync(metadata_output_dir, { recursive: true });
  }
  for (var key in metaData) {
    await writeFile(metadata_output_dir + key, JSON.stringify(metaData[key], null, 2));
  }
}