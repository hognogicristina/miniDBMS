const { client } = require('../db/mongoConnection');
const { saveCatalog, catalog } = require('../db/catalog');
const { getCurrentDatabase } = require('../db/dbState');

async function handleCreateIndex(command, socket) {
  const currentDatabase = getCurrentDatabase();
  if (!currentDatabase) {
    socket.write(`ERROR: No database selected`);
    return;
  }

  const commandText = command.join(' ');
  const regex = /createindex\s+(unique\s+)?(\w+)\s+(\w+);?/i;
  const match = commandText.match(regex);

  if (!match) {
    socket.write(`ERROR: Invalid syntax. Use "createindex [unique] table_name column_name"`);
    return;
  }

  const isUnique = !!match[1];
  const tableName = match[2];
  const columnName = match[3];

  const db = catalog.databases.find(db => db.dataBaseName === currentDatabase);
  const table = db.tables.find(t => t.tableName === tableName);

  if (!table) {
    socket.write(`ERROR: Table ${tableName} does not exist in database ${currentDatabase}`);
    return;
  }

  const indexName = `${columnName}.ind`;
  const existingIndex = table.indexFiles.find(index => index.indexName === indexName);
  if (existingIndex) {
    socket.write(`ERROR: Index with the name ${indexName} already exists on table ${tableName}`);
    return;
  }


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
    socket.write(`ERROR: Could not create index on ${columnName} in table ${tableName}`);
  }
}

module.exports = { handleCreateIndex };
