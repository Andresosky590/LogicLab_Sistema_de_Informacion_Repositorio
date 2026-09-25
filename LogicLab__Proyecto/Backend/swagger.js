const swaggerAutogen = require("swagger-autogen")();

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./app.js"];

const doc = {
  info: {
    title: "LogicLab API – Restaurante Mangata",
    description: "API REST del proyecto LogicLab",
    version: "1.0.0"
  },
  host: "localhost:5030",
  schemes: ["http"]
};

swaggerAutogen(outputFile, endpointsFiles, doc);