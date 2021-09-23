#!/usr/bin/env node

//IMPORTS
const chalk = require('chalk');
const boxen = require('boxen');
const ora = require('ora');
const inquirer = require('inquirer');
const fs = require('fs');
const { readFile, writeFile, readdir } = require("fs").promises;
const mergeImages = require('merge-images');
const { Image, Canvas } = require('canvas');
const ImageDataURI = require('image-data-uri');

//SETTINGS
let basePath = process.cwd() + '/images/';
let outputPath = process.cwd() + '/output/';
let traits;
let traitsToSort = [];
let order = [];
let weights = {};
let names = {};
let weightedTraits = [];
let seen = [];
let metaData = {};
let config = {
  metaData: {
    name: 'Y2123',
    description: 'Character ID for the future city',
  },
  imageUrl: 'y2123.com/',
  generateMetadata: true,
};

//DEFINITIONS
const getDirectories = source =>
  fs
    .readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

const sleep = seconds => new Promise(resolve => setTimeout(resolve, seconds * 1000))

//OPENING
console.log(
  boxen(
    chalk.blue(
      'OXGN Labs - Art Generator \n'
    ),
    { borderColor: 'green', padding: 2 }
  )
);
main();

async function main() {
  await loadConfig();
  const loadingDirectories = ora('Loading traits');
  loadingDirectories.color = 'yellow';
  loadingDirectories.start();
  traits = getDirectories(basePath);
  traitsToSort = [...traits];
  await sleep(2);
  loadingDirectories.succeed();
  loadingDirectories.clear();
  await traitsOrder();
  await asyncForEach(traits, async trait => {
    await setNames(trait);
  });
  await asyncForEach(traits, async trait => {
    await setWeights(trait);
  });
  const generatingImages = ora('Generating images');
  generatingImages.color = 'yellow';
  generatingImages.start();
  await generateImages();
  await sleep(2);
  generatingImages.succeed('All images generated!');
  generatingImages.clear();
  if (config.generateMetadata) {
    const writingMetadata = ora('Exporting metadata');
    writingMetadata.color = 'yellow';
    writingMetadata.start();
    await writeMetadata();
    await sleep(0.5);
    writingMetadata.succeed('Exported metadata successfully');
    writingMetadata.clear();
  }

  const writingConfig = ora('Saving configuration');
    writingConfig.color = 'yellow';
    writingConfig.start();
    await writeConfig();
    await sleep(0.5);
    writingConfig.succeed('Saved configuration successfully');
    writingConfig.clear();
}

//SELECT THE ORDER IN WHICH THE TRAITS SHOULD BE COMPOSITED
async function traitsOrder() {
  traitsToSort.forEach(trait => {
    const globalIndex = traits.indexOf(trait);
    order.push(globalIndex);
  });
}

//SET NAMES FOR EVERY TRAIT
async function setNames(trait) {
  const files = fs.readdirSync(basePath + '/' + trait);
  files.forEach((file, i) => {
    if (file != '.DS_Store') names[file] = file.split('.')[0];
  });
}

//SET WEIGHTS FOR EVERY TRAIT
async function setWeights(trait) {
  if (config.weights && Object.keys(config.weights).length === Object.keys(names).length ) {
    weights = config.weights;
    return;
  }
  const files = await getFilesForTrait(trait);
  const weightPrompt = [];
  files.forEach((file, i) => {
    weightPrompt.push({
      type: 'input',
      name: names[file] + '_weight',
      message: 'How many ' + names[file] + ' ' + trait + ' should there be?',
      default: parseInt(Math.round(10000 / files.length)),
    });
  });
  const selectedWeights = await inquirer.prompt(weightPrompt);
  files.forEach((file, i) => {
    weights[file] = selectedWeights[names[file] + '_weight'];
  });
  config.weights = weights;
}

//ASYNC FOREACH
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

//GENERATE WEIGHTED TRAITS
async function generateWeightedTraits() {
  for (const trait of traits) {
    const traitWeights = [];
    const files = await getFilesForTrait(trait);
    files.forEach(file => {
      for (let i = 0; i < weights[file]; i++) {
        traitWeights.push(file);
      }
    });
    weightedTraits.push(traitWeights);
  }
}

//GENARATE IMAGES
async function generateImages() {
  let noMoreMatches = 0;
  let images = [];
  let id = 0;
  await generateWeightedTraits();

  while (weightedTraits[0].length > 0 && noMoreMatches < 20000) {
    let picked = [];
    order.forEach(id => {
      let pickedImgId = pickRandom(weightedTraits[id]);
      picked.push(pickedImgId);
      let pickedImg = weightedTraits[id][pickedImgId];
      images.push(basePath + traits[id] + '/' + pickedImg);
    });

    if (existCombination(images)) {
      noMoreMatches++;
      images = [];
    } else {
      generateMetadataObject(id, images);
      noMoreMatches = 0;
      order.forEach((id, i) => {
        remove(weightedTraits[id], picked[i]);
      });
      seen.push(images);
      const b64 = await mergeImages(images, { Canvas: Canvas, Image: Image });
      await ImageDataURI.outputFile(b64, outputPath + `${id}.png`);
      images = [];
      id++;
    }
  }
}

//GENERATES RANDOM NUMBER BETWEEN A MAX AND A MIN VALUE
function randomNumber(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}

//PICKS A RANDOM INDEX INSIDE AND ARRAY RETURNS IT
function pickRandom(array) {
  return randomNumber(0, array.length - 1);
}

function remove(array, toPick) {
  array.splice(toPick, 1);
}

function existCombination(contains) {
  let exists = false;
  seen.forEach(array => {
    let isEqual =
      array.length === contains.length &&
      array.every((value, index) => value === contains[index]);
    if (isEqual) exists = true;
  });
  return exists;
}

function generateMetadataObject(id, images) {
  metaData[id] = {
    name: config.metaData.name + '#' + id,
    description: config.metaData.description,
    image: config.imageUrl + id,
    attributes: [],
  };
  images.forEach((image, i) => {
    let pathArray = image.split('/');
    let fileToMap = pathArray[pathArray.length - 1];
    metaData[id].attributes.push({
      trait_type: traits[order[i]],
      value: names[fileToMap],
    });
  });
}

async function writeMetadata() {
    let metadata_output_dir = outputPath
    if (!fs.existsSync(metadata_output_dir)) {
      fs.mkdirSync(metadata_output_dir, { recursive: true });
    }
    for (var key in metaData){
      await writeFile(metadata_output_dir + key + '.json', JSON.stringify(metaData[key]));
    }
}

async function loadConfig() {
  try {
    const data = await readFile('config.json')
    config = JSON.parse(data.toString());
  } catch (error) {}
}

async function writeConfig() {
  await writeFile('config.json', JSON.stringify(config, null, 2));
}

async function getFilesForTrait(trait) {
  return (await readdir(basePath + '/' + trait)).filter(file => file !== '.DS_Store');
}