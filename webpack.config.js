import dotenv from "dotenv";
import { glob } from "glob";
import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const jsFiles = await glob("./viruses/*/*.[jt]s");
let entries = {};
jsFiles.forEach((filepath) => {
  const filename = filepath.split("/").slice(-1)[0].split(".")[0];
  entries[filename] = `./${filepath}`;
});
entries["main"] = "./main.ts";
entries["static"] = "./viruses/static/static.ts";

export default {
  mode: "development",
  entry: entries,
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "build"),
    publicPath: "",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"],
  },
  externals: {
    gtag: "gtag",
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.API_BASE_URL": JSON.stringify(process.env.API_BASE_URL),
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
      },
      {
        test: /\.m?[jt]sx?$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              url: {
                filter: (url) => {
                  if (/png|svg|webp/.test(url)) {
                    return false;
                  }

                  return true;
                },
              },
            },
          },
          "sass-loader",
        ],
      },
      {
        test: /\.hbs$/,
        loader: "handlebars-loader",
      },
    ],
  },
};
