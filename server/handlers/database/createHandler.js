const {client} = require('../../db/mongoConnection');
const {saveCatalog, catalog} = require('../../db/catalog');
const {getCurrentDatabase} = require('../../db/dbState');
const {checkDatabase} = require("../../utils/databaseValidation");
const {checkTableName, validateColumnDefinitions} = require("../../utils/tableValidation");

async function handleCreate(command, socket) {
  const type = command[1].toLowerCase();

  try {
    if (type === 'database') {
      const dbName = command[2];
      const errorMessage = checkDatabase(dbName);
      if (errorMessage) return socket.write(errorMessage);

      catalog.databases.push({dataBaseName: dbName, tables: []});
      saveCatalog();
      socket.write(`Database ${dbName} created`);
    } else if (type === 'table') {
      const currentDatabase = getCurrentDatabase();
      if (!currentDatabase) return socket.write(`ERROR: No database selected`);

      const tableName = command[2];
      const columnsData = command.slice(3).join(' ');
      const tableError = checkTableName(currentDatabase, tableName);
      if (tableError) return socket.write(tableError);

      const dbEntry = catalog.databases.find(db => db.dataBaseName === currentDatabase);
      const columnValidation = validateColumnDefinitions(dbEntry, columnsData);
      if (typeof columnValidation === 'string') return socket.write(columnValidation);

      const {columns, primaryKey, foreignKeys} = columnValidation;
      const fileName = `${currentDatabase}_${tableName}`;
      const db = client.db(currentDatabase);
      await db.createCollection(fileName);

      const newTable = {
        tableName,
        fileName,
        structure: {attributes: columns},
        primaryKey: {pkAttributes: primaryKey},
        foreignKeys,
        indexFiles: []
      };

      dbEntry.tables.push(newTable);
      saveCatalog();
      socket.write(`Table ${tableName} created`);
    }
  } catch (error) {
    socket.write("ERROR: An unexpected error occurred");
  }
}

module.exports = {handleCreate};
