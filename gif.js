const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

// CLEAN TEMPORARY GENERATED GIF
const cleanTempGIFs = () => {
  const files = fs
    .readdirSync(process.cwd() + "/output/")
    .filter((file) => file.includes("out"));
  files.forEach((file) =>
    fs.unlink(`${process.cwd()}/output/${file}`, (err) => {
      if (err) console.error(err);
    })
  );
};

// WRAPPER FOR FFMPEG (TO SUPPORT ASYNC/AWAIT)
const ffmpegGenerate = async (params) => {
  const { inputs, filter = [], options = [], output } = params;
  console.log(params);
  await new Promise((resolve, reject) => {
    const command = ffmpeg();
    inputs.forEach((input) => command.input(input));
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
              options: "1170:-1:flags=lanczos",
              inputs: "0",
              outputs: "a",
            },
            {
              filter: "scale",
              options: "1170:-1:flags=lanczos",
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
              options: "1170:-1:flags=lanczos",
              inputs: "0",
              outputs: "a",
            },
            {
              filter: "scale",
              options: "1170:-1:flags=lanczos",
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

  cleanTempGIFs();
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
          options: "1170:-1:flags=lanczos",
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

module.exports = { generateGIF, generateGIFV3 };
