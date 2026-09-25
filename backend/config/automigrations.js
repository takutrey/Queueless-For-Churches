// config/auto-migrations.js
module.exports = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  dialect: "mysql", // or mysql, sqlite, etc.

  // Path to your models
  modelDir: "./models",

  // Output directory for migrations
  migrationDir: "./migrations",

  // Your models are in this format
  modelFormat: "sequelize-define",

  // Exclude certain models
  exclude: ["index.js"],

  // Custom table mappings
  tableName: (modelName) => {
    // Your tables are already named properly
    return modelName;
  },
};
