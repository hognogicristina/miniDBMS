function parseCommand(match) {
  if (!match) return `ERROR: Invalid syntax. Use "createindex [unique] table_name column_name"`;
}

function checkExistingIndex(table, columnName) {
  const indexName = `${columnName}.ind`;
  const existingIndex = table.indexFiles.some(index => index.indexName === indexName)
  if (existingIndex) return `ERROR: Index with the name ${indexName} already exists on table ${table.tableName}`;
}

module.exports = {parseCommand, checkExistingIndex};