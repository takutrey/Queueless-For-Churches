const db = require("../models/index");
const SCHOOL_EMAIL_DOMAIN = "@schoolopssuite.org";
const { hashPassword } = require("./authHelpers");
const Student = db.students;
const { Op } = require("sequelize");

const generateStudentNumber = async (joinDate, transaction) => {
  const year = joinDate
    ? new Date(joinDate).getFullYear()
    : new Date().getFullYear();

  const prefix = `STD-${year}-`;

  const lastStudent = await Student.findOne({
    where: { studentIdNumber: { [Op.like]: `${prefix}%` } },
    order: [["studentIdNumber", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  let nextSequence = 1;
  if (lastStudent) {
    const parts = lastStudent.studentIdNumber.split("-");
    const lastSequence = parseInt(parts[parts.length - 1], 10);
    nextSequence = isNaN(lastSequence) ? 1 : lastSequence + 1;
  }

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
};

const generatePasswordFromName = (name, year = null) => {
  if (!name || typeof name !== "string")
    throw new Error("Full name is required");

  const currentYear = year || new Date().getFullYear();
  const parts = name.trim().split(/\s+/);
  if (!parts.length) throw new Error("Invalid name format");

  const firstInitial = parts[0].charAt(0).toLowerCase();
  let surname =
    parts.length === 1
      ? parts[0].toLowerCase()
      : parts.slice(1).join(" ").toLowerCase();

  surname = surname.replace(/[^a-z0-9.-]/g, "");
  return `${firstInitial}.${surname}@${currentYear}`;
};

const generateAndHashPassword = async (name, year = null) => {
  return await hashPassword(generatePasswordFromName(name, year));
};

const generateEmailFromName = (name) => {
  const parts = name.trim().split(/\s+/);
  const first = parts[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const rest = parts
    .slice(1)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `${first}${rest ? "." + rest : ""}${SCHOOL_EMAIL_DOMAIN}`;
};

const generateEmailWithStudentNumber = (studentName, studentNumberId) => {
  if (!studentName || !studentNumberId)
    return generateEmailFromName(studentName);
  const cleanStudentNumber = studentNumberId.replace(/^STD-/, "");
  const emailWithoutDomain = generateEmailFromName(studentName).replace(
    SCHOOL_EMAIL_DOMAIN,
    "",
  );
  return `${emailWithoutDomain}.${cleanStudentNumber.toLowerCase()}${SCHOOL_EMAIL_DOMAIN}`;
};

module.exports = {
  generateAndHashPassword,
  generateEmailFromName,
  generateEmailWithStudentNumber,
  generatePasswordFromName,
  generateStudentNumber,
};
