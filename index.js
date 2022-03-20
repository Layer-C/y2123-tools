//IMPORTS
const chalk = require("chalk");
const boxen = require("boxen");
const ora = require("ora");
const inquirer = require("inquirer");
const fs = require("fs");
const { readFile, writeFile, readdir } = require("fs").promises;
const { generateGIF } = require("./gif");
// const ffmpeg = require("fluent-ffmpeg");
// const mergeImages = require("merge-images");
// const { Image, Canvas } = require("canvas");
// const ImageDataURI = require("image-data-uri");

//SETTINGS
let basePath = process.cwd() + "/images/";
let outputPath = process.cwd() + "/output/";
let traits;
let order = [];
let traitProbability = {};
let weights = {};
let names = {};
let weightedTraits = [];
let seen = [];
let metaData = {};
let config = {
  metaData: {
    name: "Y2123",
    description: "[Y2123](https://www.y2123.com)",
    image: "",
  },
  generateMetadata: true,
};
const outputWidth = 2339;
let totalFirstLayerWeights = 0;

//DEFINITIONS
const getDirectories = (source) =>
  fs
    .readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

const sleep = (seconds) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

//OPENING
console.log(
  boxen(chalk.blue("OXGN Labs - Art Generator \n"), {
    borderColor: "green",
    padding: 2,
  })
);
main();

async function main() {
  await loadConfig();
  const loadingDirectories = ora("Loading traits");
  loadingDirectories.color = "yellow";
  loadingDirectories.start();
  traits = getDirectories(basePath);
  await sleep(2);
  loadingDirectories.succeed();
  loadingDirectories.clear();
  await traitsOrder();
  await setTraitProbability();
  await asyncForEach(traits, async (trait) => {
    await setNames(trait);
  });
  totalFirstLayerWeights = 0;
  await asyncForEach(traits, async (trait, i) => {
    await setWeights(trait, i);
  });

  const generatingImages = ora("Generating images\n");
  generatingImages.color = "yellow";
  generatingImages.start();
  await generateImages();
  await sleep(2);
  generatingImages.succeed("All images generated!");
  generatingImages.clear();

  if (config.generateMetadata) {
    const writingMetadata = ora("Exporting metadata");
    writingMetadata.color = "yellow";
    writingMetadata.start();
    await writeMetadata();
    await sleep(0.5);
    writingMetadata.succeed("Exported metadata successfully");
    writingMetadata.clear();
  }

  const writingConfig = ora("Saving configuration");
  writingConfig.color = "yellow";
  writingConfig.start();
  await writeConfig();
  await sleep(0.5);
  writingConfig.succeed("Saved configuration successfully");
  writingConfig.clear();
}

//SELECT THE ORDER IN WHICH THE TRAITS SHOULD BE COMPOSITED
async function traitsOrder() {
  traits.forEach((trait) => {
    const globalIndex = traits.indexOf(trait);
    order.push(globalIndex);
  });
}

//SET PROBABILITY FOR EVERY TRAIT
async function setTraitProbability() {
  if (
    config.traitProbability &&
    Object.keys(config.traitProbability).length === Object.keys(traits).length
  ) {
    traitProbability = config.traitProbability;
    return;
  }
  const probabilityPrompt = [];
  traits.forEach((trait) => {
    probabilityPrompt.push({
      type: "input",
      name: trait + "_probability",
      message: trait + " probability(%)?",
      default: 100,
    });
  });
  const selectedProbability = await inquirer.prompt(probabilityPrompt);
  traits.forEach((trait) => {
    traitProbability[trait] = selectedProbability[trait + "_probability"];
  });
  config.traitProbability = traitProbability;
}

//SET NAMES FOR EVERY TRAIT
async function setNames(trait) {
  const files = fs.readdirSync(basePath + "/" + trait);
  files.forEach((file, i) => {
    if (file != ".DS_Store") names[file] = file.split(".")[0];
  });
}

//SET WEIGHTS FOR EVERY TRAIT
async function setWeights(trait, i) {
  if (
    config.weights &&
    Object.keys(config.weights).length === Object.keys(names).length
  ) {
    weights = config.weights;
    return;
  }

  const files = await getFilesForTrait(trait);
  const weightPrompt = [];
  files.forEach((file) => {
    weightPrompt.push({
      type: "input",
      name: names[file] + "_weight",
      message: names[file].split("_")[1] + " (" + trait + ") total?",
      default: 10,
    });
  });
  let totalNonFirstLayerWeights = 0;
  let selectedWeights = await inquirer.prompt(weightPrompt);
  files.forEach((file) => {
    let w = parseInt(selectedWeights[names[file] + "_weight"]);
    if (i == 0) {
      totalFirstLayerWeights += w;
    } else {
      totalNonFirstLayerWeights += w;
    }
  });

  while (i > 0 && totalNonFirstLayerWeights != totalFirstLayerWeights) {
    //repeat
    console.log(
      "Total weights for 1st layer was %d, while total weights entered for this layer was %d. Please make it match total weights of 1st layer!",
      totalFirstLayerWeights,
      totalNonFirstLayerWeights
    );
    totalNonFirstLayerWeights = 0;
    selectedWeights = await inquirer.prompt(weightPrompt);
    files.forEach((file) => {
      let w = parseInt(selectedWeights[names[file] + "_weight"]);
      totalNonFirstLayerWeights += w;
    });
  }

  files.forEach((file) => {
    let w = selectedWeights[names[file] + "_weight"];
    weights[file] = w;
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
    files.forEach((file) => {
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
  //console.log(weightedTraits);
  await writeFile(
    "weightedTraits.json",
    JSON.stringify(weightedTraits, null, 2)
  );

  while (weightedTraits[0].length > 0 && noMoreMatches < 200000) {
    let picked = [];
    order.forEach((order_id) => {
      let pickedImgId = pickRandom(weightedTraits[order_id]);
      picked.push(pickedImgId); //must be pushed to mantain order for remove(weightedTraits[id], picked[i]);
      if (randomNumber(0, 99) < traitProbability[traits[order_id]]) {
        let pickedImg = weightedTraits[order_id][pickedImgId];
        if (pickedImg === undefined) {
          console.log("WARNING: " + basePath + traits[order_id] + "/undefined");
        } else {
          images.push(basePath + traits[order_id] + "/" + pickedImg);
        }
      }
    });

    if (existCombination(images)) {
      noMoreMatches++;
      images = [];
    } else {
      console.log(`${id}.png`);
      console.log(images);

      generateMetadataObject(id, images);
      noMoreMatches = 0;
      order.forEach((id, i) => {
        remove(weightedTraits[id], picked[i]);
      });
      seen.push(images);
      await generateGIF(images, id);
      // const command = ffmpeg();
      // images.forEach((image) => command.input(image));
      // command
      //   .videoFilters(
      //     "fps=10",
      //     `scale=${outputWidth}:-1:flags=lanczos`,
      //     "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"
      //   )
      //   .outputOptions("-loop 0")
      //   .format("gif")
      //   .duration(3)
      //   .mergeToFile(outputPath + `${id}.gif`, "temp");
      // const b64 = await mergeImages(images, { Canvas: Canvas, Image: Image });
      // await ImageDataURI.outputFile(b64, outputPath + `${id}.png`);
      images = [];
      id++;
    }
  }
}

//GENERATES RANDOM NUMBER BETWEEN A MAX AND A MIN VALUE
function randomNumber(min, max) {
  return (
    (Math.floor(Math.pow(10, 14) * Math.random() * Math.random()) %
      (max - min + 1)) +
    min
  );
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
  seen.forEach((array) => {
    let isEqual =
      array.length === contains.length &&
      array.every((value, index) => value === contains[index]);
    if (isEqual) exists = true;
  });
  return exists;
}

function generateMetadataObject(id, images) {
  metaData[id] = {
    name: config.metaData.name + "#" + id,
    description: config.metaData.description,
    image: config.metaData.image + id + ".png",
    attributes: [],
  };

  images.forEach((image) => {
    let pathArray = image.split("/");
    let folderToMap = pathArray[pathArray.length - 2];
    let fileToMap = pathArray[pathArray.length - 1];
    metaData[id].attributes.push({
      trait_type: folderToMap.split("_")[1],
      value: names[fileToMap].split("_")[1],
    });
  });
}

async function writeMetadata() {
  let metadata_output_dir = outputPath;
  if (!fs.existsSync(metadata_output_dir)) {
    fs.mkdirSync(metadata_output_dir, { recursive: true });
  }
  for (var key in metaData) {
    await writeFile(
      metadata_output_dir + key + ".json",
      JSON.stringify(metaData[key], null, 2)
    );
  }
  await writeFile(
    metadata_output_dir + "batch.json",
    JSON.stringify(metaData, null, 2)
  );
}

async function loadConfig() {
  try {
    const data = await readFile("config.json");
    config = JSON.parse(data.toString());
  } catch (error) {}
}

async function writeConfig() {
  await writeFile("config.json", JSON.stringify(config, null, 2));
}

async function getFilesForTrait(trait) {
  return (await readdir(basePath + "/" + trait)).filter(
    (file) => file !== ".DS_Store"
  );
}
