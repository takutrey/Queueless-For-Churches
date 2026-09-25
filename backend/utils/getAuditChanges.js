function getChanges(before, after) {
  const changes = {};

  if (!before || !after) return changes;

  for (const key of Object.keys(after)) {
    const oldValue = before[key];
    const newValue = after[key];

    const changed =
      oldValue !== newValue &&
      !(oldValue == null && newValue === "") &&
      !(newValue == null && oldValue === "");

    if (changed) {
      changes[key] = { from: oldValue, to: newValue };
    }
  }

  return changes;
}

module.exports = getChanges;
