#!/usr/bin/env node
/**
 * generate-migrations.js
 *
 * Scans your ./models directory, parses each Sequelize model,
 * and writes a timestamped migration file into ./migrations/.
 *
 * Usage:
 *   node generate-migrations.js
 *   node generate-migrations.js --models ./src/models --out ./src/migrations
 *
 * Each generated migration has a proper up() (createTable) and
 * down() (dropTable), so `sequelize db:migrate` and
 * `sequelize db:migrate:undo` both work correctly.
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const modelsDir = argVal(args, "--models") || "./models";
const migrDir = argVal(args, "--out") || "./migrations";
const dryRun = args.includes("--dry-run");

function argVal(arr, flag) {
  const i = arr.indexOf(flag);
  return i !== -1 ? arr[i + 1] : null;
}

// ── Map Sequelize DataTypes → migration column type strings ──────────────────
const TYPE_MAP = {
  STRING: "DataTypes.STRING",
  TEXT: "DataTypes.TEXT",
  INTEGER: "DataTypes.INTEGER",
  BIGINT: "DataTypes.BIGINT",
  FLOAT: "DataTypes.FLOAT",
  DOUBLE: "DataTypes.DOUBLE",
  DECIMAL: "DataTypes.DECIMAL",
  BOOLEAN: "DataTypes.BOOLEAN",
  DATE: "DataTypes.DATE",
  DATEONLY: "DataTypes.DATEONLY",
  UUID: "DataTypes.UUID",
  UUIDV4: "DataTypes.UUIDV4",
  JSON: "DataTypes.JSON",
  JSONB: "DataTypes.JSONB",
  ENUM: "DataTypes.ENUM",
  ARRAY: "DataTypes.ARRAY",
  BLOB: "DataTypes.BLOB",
};

// ── Helper: format a single arg for interpolation into generated JS source ────
// Handles plain strings/numbers AND nested type tokens, e.g. the STRING
// inside DataTypes.ARRAY(DataTypes.STRING) — without this, a nested,
// uncalled type reference silently disappears (JSON.stringify(fn) === undefined),
// producing broken output like `DataTypes.ARRAY()` that crashes at migration time.
function formatArgLiteral(value) {
  if (
    value &&
    typeof value === "function" &&
    typeof value.__type === "string"
  ) {
    return value.__type;
  }
  if (typeof value === "string") {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return JSON.stringify(value);
}

// ── A chainable "type token" that stringifies to its own source text ─────────
// Supports: bare access (DataTypes.UUID), calls (DataTypes.STRING(100)),
// nested calls (DataTypes.ARRAY(DataTypes.STRING)), and property chaining
// (DataTypes.STRING(255).BINARY, DataTypes.CHAR(1).BINARY).
function makeTypeToken(str) {
  const target = function (...args) {
    if (!args.length) return makeTypeToken(str);
    const formatted = args.map(formatArgLiteral);
    return makeTypeToken(`${str}(${formatted.join(", ")})`);
  };
  target.__type = str;
  target.toString = () => str;
  target.valueOf = () => str;
  return new Proxy(target, {
    get(t, prop) {
      if (typeof prop === "symbol") return t[prop];
      if (prop in t) return t[prop];
      // Unknown property access = chaining, e.g. .BINARY, .UNSIGNED, .ZEROFILL
      return makeTypeToken(`${str}.${String(prop)}`);
    },
  });
}

// ── Fake Sequelize stub – lets us require() models without a real DB ──────────
function makeSequelizeStub() {
  const DataTypes = new Proxy(
    {},
    {
      get(_, prop) {
        if (typeof prop === "symbol") return undefined;
        // DataTypes.UUID → token that stringifies to "DataTypes.UUID"
        // DataTypes.STRING(100) → "DataTypes.STRING(100)"
        // DataTypes.ENUM('a', 'b') → 'DataTypes.ENUM("a", "b")'
        // DataTypes.ARRAY(DataTypes.STRING) → 'DataTypes.ARRAY(DataTypes.STRING)'
        const base = TYPE_MAP[prop] || `DataTypes.${prop}`;
        return makeTypeToken(base);
      },
    },
  );

  // Minimal sequelize.define stub – returns a constructor-like object
  // so prototype method assignments (Model.prototype.foo = ...) don't throw.
  const sequelize = {
    define(modelName, attributes, options = {}) {
      function ModelStub() {}
      ModelStub.__modelName = modelName;
      ModelStub.__attributes = attributes;
      ModelStub.__options = options;
      // absorb any static method assignments (User.associate = ..., etc.)
      return new Proxy(ModelStub, {
        set(t, k, v) {
          t[k] = v;
          return true;
        },
        get(t, k) {
          return k in t ? t[k] : undefined;
        },
      });
    },
  };

  return { sequelize, DataTypes };
}

// ── Collect model files ───────────────────────────────────────────────────────
function collectModelFiles(dir) {
  const abs = path.resolve(dir);
  const files = [];

  if (!fs.existsSync(abs)) {
    console.error(`[error] Models directory not found: ${abs}`);
    process.exit(1);
  }

  function walk(current) {
    for (const entry of fs.readdirSync(current)) {
      const full = path.join(current, entry);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (entry === "index.js" || entry.endsWith(".test.js")) continue;
      if (entry.endsWith(".js")) files.push(full);
    }
  }

  walk(abs);
  return files;
}

// ── Load a single model file using the stub ───────────────────────────────────
function loadModel(filePath) {
  const { sequelize, DataTypes } = makeSequelizeStub();
  try {
    const factory = require(filePath);
    if (typeof factory !== "function") return null;
    const model = factory(sequelize, DataTypes);
    if (!model || !model.__modelName) return null;
    return model;
  } catch (err) {
    console.warn(`[warn] Could not load ${filePath}: ${err.message}`);
    return null;
  }
}

// ── Serialise a single column definition to JS source ────────────────────────
function serializeColumn(name, def) {
  const lines = [];

  // type
  const rawType = def.type;
  let typeStr;
  if (typeof rawType === "string") typeStr = rawType;
  else if (rawType && rawType.__type) typeStr = rawType.__type;
  else if (rawType && rawType.toString) typeStr = rawType.toString();
  else typeStr = "DataTypes.STRING";

  lines.push(`type: ${typeStr}`);

  // common attributes
  if (def.primaryKey) lines.push("primaryKey: true");
  if (def.autoIncrement) lines.push("autoIncrement: true");
  if (def.allowNull === false) lines.push("allowNull: false");
  if (def.allowNull === true) lines.push("allowNull: true");
  if (def.unique) lines.push("unique: true");
  if (def.defaultValue !== undefined) {
    const dv = def.defaultValue;
    // Sequelize sentinel objects (e.g. DataTypes.UUIDV4)
    if (dv && typeof dv === "function" && dv.__type) {
      lines.push(`defaultValue: ${dv.__type}`);
    } else if (dv === null) {
      lines.push("defaultValue: null");
    } else if (typeof dv === "string") {
      lines.push(
        `defaultValue: "${dv.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
      );
    } else {
      lines.push(`defaultValue: ${JSON.stringify(dv)}`);
    }
  }
  // ENUM values passed separately as `values: [...]` rather than via
  // DataTypes.ENUM(...) — must be quoted as strings, not bare identifiers.
  if (def.values && Array.isArray(def.values)) {
    const quoted = def.values.map(formatArgLiteral);
    lines.push(`values: [${quoted.join(", ")}]`);
  }
  if (def.references) {
    lines.push(
      `references: { model: "${def.references.model}", key: "${def.references.key || "id"}" }`,
    );
  }
  if (def.onDelete) lines.push(`onDelete: "${def.onDelete}"`);
  if (def.onUpdate) lines.push(`onUpdate: "${def.onUpdate}"`);
  if (def.comment) lines.push(`comment: "${def.comment}"`);

  const pad = "          ";
  const body = lines.join(`,\n${pad}`);
  return `        ${name}: {\n${pad}${body}\n        }`;
}

// ── Build timestamps columns if the model uses them ──────────────────────────
function timestampColumns(options) {
  const ts = options.timestamps !== false; // default true in Sequelize
  if (!ts) return "";

  const createdAt = options.createdAt || "createdAt";
  const updatedAt = options.updatedAt || "updatedAt";

  return `
        ${createdAt}: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        ${updatedAt}: {
          type: DataTypes.DATE,
          allowNull: false,
        },`;
}

// ── Generate migration source for one model ───────────────────────────────────
function generateMigration(model) {
  const tableName = model.__options.tableName || model.__modelName;
  const attributes = model.__attributes;
  const options = model.__options;

  const columnDefs = Object.entries(attributes)
    .map(([name, def]) => serializeColumn(name, def))
    .join(",\n");

  const tsCols = timestampColumns(options);

  const paranoid = options.paranoid
    ? `
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },`
    : "";

  return `"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("${tableName}", {
${columnDefs},${tsCols}${paranoid}
    });
  },

  async down(queryInterface, _DataTypes) {
    await queryInterface.dropTable("${tableName}");
  },
};
`;
}

// ── Timestamp prefix for migration filenames (yyyymmddHHMMSS) ─────────────────
function timestamp(offset = 0) {
  const d = new Date(Date.now() + offset * 1000);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0"),
  ].join("");
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  console.log(`\n🔍  Scanning models in: ${path.resolve(modelsDir)}`);

  const files = collectModelFiles(modelsDir);
  const models = files.map(loadModel).filter(Boolean);

  if (models.length === 0) {
    console.error("[error] No valid Sequelize models found. Exiting.");
    process.exit(1);
  }

  console.log(`✅  Found ${models.length} model(s):`);
  models.forEach((m) => console.log(`    • ${m.__modelName}`));

  if (!dryRun) {
    fs.mkdirSync(path.resolve(migrDir), { recursive: true });
  }

  models.forEach((model, idx) => {
    const ts = timestamp(idx); // 1-second gap per file keeps ordering stable
    const name = model.__modelName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const filename = `${ts}-create-${name}.js`;
    const outPath = path.join(path.resolve(migrDir), filename);
    const source = generateMigration(model);

    if (dryRun) {
      console.log(`\n──── [dry-run] ${filename} ────`);
      console.log(source);
    } else {
      fs.writeFileSync(outPath, source, "utf8");
      console.log(`📄  Written: ${outPath}`);
    }
  });

  if (!dryRun) {
    console.log(
      `\n🎉  Done! Run your migrations with:\n    npx sequelize-cli db:migrate\n`,
    );
  }
}

main();
