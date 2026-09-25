"use strict";

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

// models/index.js typically exports { sequelize, Sequelize, ...models }
const db = require("./models");
const { sequelize, Sequelize } = db;

// If models/index.js exports each model directly, db itself is the map.
// If it exports { sequelize, Model1, Model2, ... }, we scan its values.
const models = Object.values(db).filter(
  (v) => v && typeof v.getTableName === "function" && v.rawAttributes,
);

(async () => {
  if (!models.length) {
    console.error("No models found on ./models/index.js export.");
    process.exit(1);
  }

  let anyDrift = false;

  for (const model of models) {
    const table = model.getTableName();
    const [rows] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\``);
    const dbCols = rows.map((r) => r.Field);
    const modelCols = Object.keys(model.rawAttributes);

    const missing = modelCols.filter((c) => !dbCols.includes(c));
    const extra = dbCols.filter((c) => !modelCols.includes(c));

    if (missing.length || extra.length) {
      anyDrift = true;
      console.log(`\n[${model.name}]  table: ${table}`);
      if (missing.length)
        console.log(`  ❌ model has, DB missing: ${missing.join(", ")}`);
      if (extra.length)
        console.log(`  ⚠️  DB has, model missing: ${extra.join(", ")}`);
    }
  }

  if (!anyDrift) console.log("\n✅ No drift. Model and DB match.");
  else console.log("\n⚠️  Drift found — write a migration before continuing.");

  await sequelize.close();
  process.exit(anyDrift ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
