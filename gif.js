const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const mergeImages = require("merge-images");
const { Image, Canvas } = require("canvas");
const ImageDataURI = require("image-data-uri");

const outputPath = process.cwd() + "/output/";
const outputWidth = 585;

// CLEAN TEMPORARY GENERATED GIF
const cleanFiles = (directory, matcher) => {
  const files = fs.readdirSync(directory).filter(matcher);
  files.forEach((file) =>
    fs.unlink(`${process.cwd()}/output/${file}`, (err) => {
      if (err) console.error(err);
    })
  );
};

// WRAPPER FOR FFMPEG (TO SUPPORT ASYNC/AWAIT)
const ffmpegGenerate = async (params) => {
  const { inputs, filter = [], options = [], output, fps } = params;
  console.log(params);
  await new Promise((resolve, reject) => {
    const command = ffmpeg();
    inputs.forEach((input) => command.input(input));

    if (typeof fps === "number") command.fps(fps).inputFPS(fps);

    command
      .complexFilter(...filter)
      .outputOptions(options)
      .on("progress", (progress) => {
        console.log(`[ffmpeg] ${JSON.stringify(progress)}`);
      })
      .on("error", (err) => {
        console.info(`[ffmpeg] error: ${err.message}`);
        reject(err);
      })
      .on("end", () => {
        console.log("[ffmpeg] finished");
        resolve();
      })
      .save(output);
  });
};

//GENERATE PNG FROM GIVEN IMAGES
const generatePNG = async (images, id, resize = false) => {
  // create output folder if not exists
  if (!fs.existsSync("./output")) fs.mkdirSync("./output");

  let b64;

  // if resize is specified
  if (resize) {
    const temp = [];
    // resize all layers
    for (let i = 0; i < images.length; i++) {
      const output = `${process.cwd()}/output/out${i + 1}.png`;
      await ffmpegGenerate({
        inputs: [images[i]],
        filter: [
          {
            filter: "scale",
            options: `${outputWidth}:-1:flags=lanczos`,
            inputs: "0",
            outputs: "output",
          },
          "output",
        ],
        output,
      });
      // push them onto a temporary array
      temp.push(output);
    }
    b64 = await mergeImages(temp, { Canvas: Canvas, Image: Image });
  } else {
    b64 = await mergeImages(images, { Canvas: Canvas, Image: Image });
  }

  // write to an output image
  await ImageDataURI.outputFile(b64, outputPath + `${id}.png`);
  // clean temp files
  cleanFiles(outputPath, (file) => file.includes("out"));
};

//GENERATE GIF FROM GIVEN IMAGES
const generateGIF = async (images, id) => {
  let i = 0;

  if (!fs.existsSync("./output")) fs.mkdirSync("./output");

  while (images.length > 0) {
    if (fs.existsSync(`${process.cwd()}/output/out${i}.gif`)) {
      await ffmpegGenerate({
        inputs: [`${process.cwd()}/output/out${i}.gif`, images.shift()],
        filter: [
          [
            {
              filter: "scale",
              options: `${outputWidth}:-1:flags=lanczos`,
              inputs: "0",
              outputs: "a",
            },
            {
              filter: "scale",
              options: `${outputWidth}:-1:flags=lanczos`,
              inputs: "1",
              outputs: "b",
            },
            { filter: "overlay", inputs: ["a", "b"], outputs: "merged" },
            { filter: "split", inputs: "merged", outputs: ["s0", "s1"] },
            {
              filter: "palettegen",
              inputs: "s0",
              outputs: "p",
            },
            {
              filter: "paletteuse",
              inputs: ["s1", "p"],
              outputs: "output",
            },
          ],
          "output",
        ],
        output: `${process.cwd()}/output/out${i + 1}.gif`,
      });
      i++;
    } else {
      await ffmpegGenerate({
        inputs: [images.shift(), images.shift()],
        filter: [
          [
            {
              filter: "scale",
              options: `${outputWidth}:-1:flags=lanczos`,
              inputs: "0",
              outputs: "a",
            },
            {
              filter: "scale",
              options: `${outputWidth}:-1:flags=lanczos`,
              inputs: "1",
              outputs: "b",
            },
            { filter: "overlay", inputs: ["a", "b"], outputs: "merged" },
            { filter: "split", inputs: "merged", outputs: ["s0", "s1"] },
            {
              filter: "palettegen",
              inputs: "s0",
              outputs: "p",
            },
            {
              filter: "paletteuse",
              inputs: ["s1", "p"],
              outputs: "output",
            },
          ],
          "output",
        ],
        output: `${process.cwd()}/output/out0.gif`,
      });
    }
  }

  fs.renameSync(
    `${process.cwd()}/output/out${i}.gif`,
    `${process.cwd()}/output/${id}.gif`
  );

  cleanFiles(outputPath, (file) => file.includes("out"));
};

//GENERATE GIF FROM GIVEN IMAGES
const generateGIFV3 = async (images, id) => {
  if (!fs.existsSync("./output")) fs.mkdirSync("./output");

  await ffmpegGenerate({
    inputs: images,
    filter: [
      [
        ...images.map((_, idx) => ({
          filter: "scale",
          options: `${outputWidth}:-1:flags=lanczos`,
          inputs: `${idx}`,
          outputs: String.fromCharCode(idx + 97),
        })),
        ...[...new Array(images.length - 1)].map((_, idx) => ({
          filter: "overlay",
          inputs:
            idx === 0
              ? ["a", "b"]
              : [`m${idx - 1}`, String.fromCharCode(idx + 1 + 97)],
          outputs: idx === images.length - 2 ? "output" : `m${idx}`,
        })),
        { filter: "split", inputs: "merged", outputs: ["s0", "s1"] },
        {
          filter: "palettegen",
          inputs: "s0",
          outputs: "p",
        },
        {
          filter: "paletteuse",
          inputs: ["s1", "p"],
          outputs: "output",
        },
      ],
      "output",
    ],
    output: `${process.cwd()}/output/${id}.gif`,
  });
};

//GENERATE GIF FROM GIVEN IMAGES
const generateGIFV4 = async (images, id) => {
  if (!fs.existsSync("./output")) fs.mkdirSync("./output");

  // merge and export to PNG frames
  await ffmpegGenerate({
    inputs: images,
    filter: [
      [
        ...images.map((_, idx) => ({
          filter: "scale",
          options: `${outputWidth}:-1:flags=lanczos`,
          inputs: `${idx}`,
          outputs: String.fromCharCode(idx + 97),
        })),
        ...[...new Array(images.length - 1)].map((_, idx) => ({
          filter: "overlay",
          inputs:
            idx === 0
              ? ["a", "b"]
              : [`m${idx - 1}`, String.fromCharCode(idx + 1 + 97)],
          outputs: idx === images.length - 2 ? "merged" : `m${idx}`,
        })),
        // { filter: "split", inputs: "merged", outputs: ["s0", "s1"] },
        // {
        //   filter: "palettegen",
        //   inputs: "s0",
        //   outputs: "p",
        // },
        // {
        //   filter: "paletteuse",
        //   inputs: ["s1", "p"],
        //   outputs: "output",
        // },
      ],
      // "output",
      "merged",
    ],
    output: `${process.cwd()}/output/${id}_%05d.png`,
    fps: 24,
  });

  // combine PNG frames to gif
  const { stdout, stderr } = await exec(
    `gifski -Q 100 -W ${outputWidth} -o ./output/${id}.gif ./output/${id}*.png`
  );
  if (stderr) console.log(`[error-gifski] ${stderr}`);
  console.log(`[gifski] ${stdout}`);

  // clean PNG frames
  cleanFiles(outputPath, (file) => file.match(/^.*_\d{5}.png$/g));
};

module.exports = { generatePNG, generateGIF, generateGIFV3, generateGIFV4 };
