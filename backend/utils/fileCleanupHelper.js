const fs = require("fs");

const cleanupFiles = (files) => {
  if (!files) return;

  const fileArray = Array.isArray(files) ? files : Object.values(files).flat();

  fileArray.forEach((file) => {
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.error("Failed to delete file:", file.path, err);
      });
    }
  });
};

module.exports = cleanupFiles;
