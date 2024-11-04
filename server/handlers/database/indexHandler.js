const {client} = require('../../db/mongoConnection');
const {saveCatalog} = require('../../db/catalog');
const {checkDatabaseSelection} = require('../../utils/databaseValidation');
const {checkExistingIndex} = require('../../utils/indexValidation');
const {findTable, checkColumnExists} = require('../../utils/tableValidation');
const {getCurrentDatabase} = require("../../db/dbState");
const {parseCommandIndex} = require('../../utils/commandValidation');

async function handleCreateIndex(command, socket) {
  const dbError = checkDatabaseSelection();
  if (dbError) {
    socket.write(dbError);
    return;
  }

  const commandText = command.join(' ');

  // Updated regex to remove parentheses around the column name
  const regex = /create\s+(unique\s+)?index\s+(\w+)\s+on\s+(\w+)\s+(\w+)/i;
  const match = commandText.match(regex);

  const indexErrorCmd = parseCommandIndex(match);
  if (indexErrorCmd) {
    socket.write(indexErrorCmd);
    return;
  }

  const isUnique = !!match[1];
  const indexName = match[2] + '.ind';
  const tableName = match[3];
  const columnName = match[4];

  const table = findTable(tableName);
  if (typeof table === 'string') {
    socket.write(table);
    return;
  }

  const columnError = checkColumnExists(table, tableName, columnName);
  if (columnError) {
    socket.write(columnError);
    return;
  }

  const indexError = checkExistingIndex(table, indexName);
  if (indexError) {
    socket.write(indexError);
    return;
  }

  const currentDatabase = getCurrentDatabase();
  const collectionName = `${currentDatabase}_${tableName}_idx_${indexName}`;
  const collection = client.db(currentDatabase).collection(collectionName);

  try {
    const indexOptions = isUnique ? {unique: true} : {unique: false};
    await collection.createIndex({[columnName]: 1}, indexOptions);

    const indexEntry = {
      indexName: indexName,
      isUnique: isUnique ? 1 : 0,
      indexAttributes: [columnName]
    };

    table.indexFiles.push(indexEntry);
    saveCatalog();

    socket.write(`Index ${indexName} created on column ${columnName} in table ${tableName} (Unique: ${isUnique})`);
  } catch (error) {
    socket.write(`ERROR: Could not create index ${indexName} on column ${columnName} in table ${tableName}`);
  }
}

module.exports = {handleCreateIndex};
