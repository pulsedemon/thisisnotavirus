const path = require("path");
const glob = require("glob");

const jsFiles = glob.sync("./viruses/*/*.js");
let entries = {};
jsFiles.forEach((filepath) => {
  const filename = filepath.split("/").slice(-1)[0].split(".")[0];
  entries[filename] = filepath;
});
entries["main"] = "./main.js";

module.exports = {
  mode: "none",
  entry: entries,
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "build"),
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
};
