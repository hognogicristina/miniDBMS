const {client} = require('../../db/mongoConnection');
const {saveCatalog} = require('../../db/catalog');
const {checkDatabaseSelection} = require('../../utils/databaseValidation');
const {parseCommand, checkExistingIndex} = require('../../utils/indexValidation');
const {findTable, checkColumnExists} = require('../../utils/tableValidation');
const {getCurrentDatabase} = require("../../db/dbState");

async function handleCreateIndex(command, socket) {
  const dbError = checkDatabaseSelection();
  if (dbError) {
    socket.write(dbError);
    return;
  }

  const commandText = command.join(' ');
  const regex = /createindex\s+(unique\s+)?(\w+)\s+(\w+);?/i;
  const match = commandText.match(regex);

  const errorMessage = parseCommand(match);
  if (errorMessage) {
    socket.write(errorMessage);
    return;
  }

  const isUnique = !!match[1];
  const tableName = match[2];
  const columnName = match[3];

  const table = findTable(tableName);
  if (typeof table === 'string') return socket.write(table);

  const columnError = checkColumnExists(table, tableName, columnName);
  if (columnError) {
    socket.write(columnError);
    return;
  }

  const indexError = checkExistingIndex(table, columnName);
  if (indexError) {
    socket.write(indexError);
    return;
  }

  const currentDatabase = getCurrentDatabase();
  const indexName = `${columnName}.ind`;
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
    console.error(error);
    socket.write(`ERROR: Could not create index on ${columnName} in table ${tableName}`);
  }
}

module.exports = {handleCreateIndex};
