const multer = require("multer");
const path = require("path");
const fs = require("fs");

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // Excel + CSV
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/csv",

  // PowerPoint
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // Images
  "image/jpeg",
  "image/png",
  "image/gif",

  // Text
  "text/plain",

  // Archives
  "application/zip",
  "application/x-zip-compressed",
];

// Create uploads directory if it doesn't exist
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueName}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Check if file type is allowed
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }

  // Check file extension as fallback
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".zip",
  ];

  if (allowedExts.includes(ext)) {
    return cb(null, true);
  }

  cb(
    new Error(
      "Invalid file format. Allowed formats: PDF, images, Word, Excel, PowerPoint, text files, and ZIP archives.",
    ),
  );
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// For study materials - expects field name "files"
const uploadStudyMaterialFiles = upload.array("files", 20);

const uploadAssignmentFiles = upload.array("attachments", 10);

// For single image upload (for other use cases)
const uploadSingleImage = upload.single("image");

const uploadMessageAttachments = upload.array("attachments", 10);

const uploadDiscussionPostAttchments = upload.array("attachments", 10);

// For multiple images upload (for other use cases)
const uploadMultipleImages = upload.array("images", 10);

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
  uploadStudyMaterialFiles,
  uploadAssignmentFiles,
  uploadMessageAttachments,
  uploadDiscussionPostAttchments,
  ALLOWED_TYPES,
};
