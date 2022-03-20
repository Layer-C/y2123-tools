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
  const { input1, input2, filter, output } = params;
  console.log(params);
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(input1)
      .input(input2)
      .complexFilter(filter)
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
        input1: `${process.cwd()}/output/out${i}.gif`,
        input2: images.shift(),
        filter: "overlay",
        output: `${process.cwd()}/output/out${i + 1}.gif`,
      });
      i++;
    } else {
      await ffmpegGenerate({
        input1: images.shift(),
        input2: images.shift(),
        filter: "overlay",
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

module.exports = { generateGIF };
