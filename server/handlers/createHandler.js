const { client } = require('../db/mongoConnection');
const { saveCatalog, catalog } = require('../db/catalog');
const { getCurrentDatabase } = require('../db/dbState');
const { isValidDataType, isValidColumnModifier } = require('../utils/dataValidation');

async function handleCreate(command, socket) {
  const type = command[1].toLowerCase();

  if (type === 'database') {
    const dbName = command[2];

    if (!dbName) {
      socket.write(`ERROR: Database name required`);
      return;
    }

    if (catalog.databases.find(db => db.dataBaseName === dbName)) {
      socket.write(`ERROR: Database ${dbName} already exists`);
      return;
    }

    catalog.databases.push({
      dataBaseName: dbName,
      tables: []
    });

    saveCatalog();
    socket.write(`Database ${dbName} created`);
  } else if (type === 'table') {
    const currentDatabase = getCurrentDatabase();
    if (currentDatabase) {
      const tableName = command[2];
      const columnsData = command.slice(3).join(' ');

      if (!tableName) {
        socket.write(`ERROR: Table name required`);
        return;
      }

      const dbEntry = catalog.databases.find(db => db.dataBaseName === currentDatabase);
      if (dbEntry.tables.find(table => table.tableName === tableName)) {
        socket.write(`ERROR: Table ${tableName} already exists in database ${currentDatabase}`);
        return;
      }

      const columns = [];
      const primaryKey = [];
      const foreignKeys = [];
      const columnNames = new Set();

      const columnDefinitions = columnsData.split(',');
      for (const definition of columnDefinitions) {
        const parts = definition.trim().split(' ');
        const columnName = parts[0];
        const columnType = parts[1];
        const columnLength = parts[2] ? parseInt(parts[2], 10) : null;

        if (columnNames.has(columnName)) {
          socket.write(`ERROR: Duplicate column name ${columnName}`);
          return;
        }

        if (!isValidDataType(columnType, columnLength)) {
          socket.write(`ERROR: Invalid data type for column ${columnName}`);
          return;
        }

        for (const part of parts) {
          if (part !== columnName && part !== columnType && !Number.isInteger(columnLength)) {
            if (part.startsWith('foreign=')) {
              const foreignKeyParts = part.split('=')[1].split('.');
              if (foreignKeyParts.length !== 2) {
                socket.write(`ERROR: Invalid foreign key reference in column ${columnName}`);
                return;
              }
              const [refTable, refColumn] = foreignKeyParts;

              const referencedTable = dbEntry.tables.find(t => t.tableName === refTable);
              if (!referencedTable) {
                socket.write(`ERROR: Referenced table ${refTable} does not exist`);
                return;
              }

              const refColumnExists = referencedTable.structure.attributes.some(attr => attr.attributeName === refColumn);
              if (!refColumnExists) {
                socket.write(`ERROR: Referenced column ${refColumn} does not exist in table ${refTable}`);
                return;
              }

              foreignKeys.push({
                fkAttributes: [columnName],
                references: {refTable: refTable, refAttributes: [refColumn]}
              });
            } else if (!isValidColumnModifier(part)) {
              socket.write(`ERROR: Invalid column modifier "${part}" in column ${columnName}`);
              return;
            }
          }
        }

        columnNames.add(columnName);
        const column = {
          attributeName: columnName,
          type: columnType,
          length: columnLength
        };

        if (parts.includes('primary')) {
          primaryKey.push(columnName);
        }

        columns.push(column);
      }

      if (columns.length === 0) {
        socket.write(`ERROR: At least one column is required`);
        return;
      }

      if (primaryKey.length === 0) {
        socket.write(`ERROR: Primary key is required`);
        return;
      }

      const fileName = `${currentDatabase}_${tableName}`;
      const db = client.db(currentDatabase);
      await db.createCollection(fileName);

      const newTable = {
        tableName: tableName,
        fileName: fileName,
        structure: {attributes: columns},
        primaryKey: {pkAttributes: primaryKey},
        foreignKeys: foreignKeys,
        indexFiles: []
      };

      dbEntry.tables.push(newTable);
      saveCatalog();
      socket.write(`Table ${tableName} created`);

    } else {
      socket.write(`ERROR: No database selected`);
    }
  }
}

module.exports = { handleCreate };
