function checkExistingIndex(table, indexName) {
  const existingIndex = table.indexFiles.some(index => index.indexName === indexName);
  if (existingIndex) return `ERROR: Index with the name ${indexName} already exists on table ${table.tableName}`;
}

module.exports = {checkExistingIndex};
