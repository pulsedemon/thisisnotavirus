const path = require("path");
const glob = require("glob");

const jsFiles = glob.sync("./viruses/*/*.[jt]s");
let entries = {};
jsFiles.forEach((filepath) => {
  const filename = filepath.split("/").slice(-1)[0].split(".")[0];
  entries[filename] = filepath;
});
entries["main"] = "./main.js";

module.exports = {
  mode: "development",
  entry: entries,
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "build"),
  },
  module: {
    rules: [
      {
        test: /\.m?[jt]sx?$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
    ],
  },
};
