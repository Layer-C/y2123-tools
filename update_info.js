const basePath = process.cwd();
const fs = require('fs');

// General metadata for Opensea
const namePrefix = 'Y2123';
const description = '[Y2123](https://www.y2123.com)';
const baseUri = 'https://img-cs.y2123.io';

// read json data
for (let i = 0; i < 500; i++) {
  let rawdata = fs.readFileSync(`${basePath}/metadata/${i}.json`);
  let item = JSON.parse(rawdata);

  //item.name = `${namePrefix}#${i}`;
  //item.description = description;
  item.image = `${baseUri}/${i}.png`;
  item.attributes.push({
    trait_type: 'Type',
    value: 'Genesis - Explorer (500 Only)',
  });

  fs.writeFileSync(`${basePath}/metadata/${i}.json`, JSON.stringify(item, null, 2));
}

console.log(`Updated baseUri for images to ===> ${baseUri}`);
console.log(`Updated description for images to ===> ${description}`);
console.log(`Updated name prefix for images to ===> ${namePrefix}`);
