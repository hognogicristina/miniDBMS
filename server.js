const net = require('net');
const fs = require('fs');
const {MongoClient} = require('mongodb');

const uri = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(uri);
let currentDatabase = null;
const catalogFile = 'Catalog.json';

let catalog = {};
if (fs.existsSync(catalogFile)) {
  catalog = JSON.parse(fs.readFileSync(catalogFile));
} else {
  catalog = {databases: []};
  fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 4));
}

async function connectMongo() {
  try {
    await client.connect();
    console.log(`Connected to MongoDB`);
  } catch (err) {
    console.error(err);
  }
}

connectMongo();

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const command = data.toString().trim().split(' ');
    if (command[0].toLowerCase() === 'exit') {
      socket.write('exit');
      socket.end();
    } else {
      handleCommand(command, socket);
    }
  });

  socket.on('end', () => {
    console.log(`Client disconnected`);
  });
});

server.listen(8989, '127.0.0.1', () => {
  console.log(`Server listening on port 8989`);
});

async function handleCommand(command, socket) {
  const cmd = command[0].toLowerCase();
  switch (cmd) {
    case 'create':
      if (command[1].toLowerCase() !== 'database' && command[1].toLowerCase() !== 'table') {
        socket.write(`ERROR: Invalid syntax. Use "create database" or "create table".`);
      } else {
        await handleCreate(command, socket);
      }
      break;
    case 'drop':
      if (command[1].toLowerCase() !== 'database' && command[1].toLowerCase() !== 'table') {
        socket.write(`ERROR: Invalid syntax. Use "drop database" or "drop table".`);
      } else {
        await handleDrop(command, socket);
      }
      break;
    case 'use':
      handleUse(command, socket);
      break;
    case 'list':
      if (command[1].toLowerCase() === 'databases') {
        listDatabases(socket);
      } else if (command[1].toLowerCase() === 'tables') {
        listTables(socket);
      } else {
        socket.write(`ERROR: Invalid syntax. Use "list databases" or "list tables".`);
      }
      break;
    case 'createindex':
      await handleCreateIndex(command, socket);
      break;
    default:
      socket.write('ERROR: Invalid command');
      break;
  }
}

function isValidDataType(type, length) {
  const validTypesWithLength = ['varchar', 'char'];
  if (validTypesWithLength.includes(type)) {
    return length && Number.isInteger(length) && length > 0;
  }

  const validTypes = ['int', 'float', 'bool', 'date'];
  return validTypes.includes(type);
}

function isValidColumnModifier(modifier) {
  const validModifiers = ['primary'];
  if (modifier.startsWith('foreign=')) {
    return true;
  }

  return validModifiers.includes(modifier.toLowerCase());
}

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

async function handleDrop(command, socket) {
  const type = command[1].toLowerCase();

  if (type === 'database') {
    const dbName = command[2];
    const dbIndex = catalog.databases.findIndex(db => db.dataBaseName === dbName);
    if (dbIndex === -1) {
      socket.write(`ERROR: Database ${dbName} does not exist`);
    } else {
      try {
        const db = client.db(dbName);
        await db.dropDatabase();

        catalog.databases.splice(dbIndex, 1);
        saveCatalog();

        socket.write(`Database ${dbName} dropped`);
      } catch (err) {
        socket.write(`ERROR: Failed to drop database ${dbName}`);
      }
    }

  } else if (type === 'table') {
    if (currentDatabase) {
      const tableName = command[2];
      const db = catalog.databases.find(db => db.dataBaseName === currentDatabase);
      const tableIndex = db.tables.findIndex(t => t.tableName === tableName);

      if (tableIndex === -1) {
        socket.write(`ERROR: Table ${tableName} does not exist in database ${currentDatabase}`);
        return;
      }

      const table = db.tables[tableIndex];
      const foreignKeyCheck = db.tables.some(t =>
        t.foreignKeys.some(fk => fk.references.refTable === tableName)
      );

      if (foreignKeyCheck) {
        socket.write(`ERROR: Cannot drop table ${tableName}, it is referenced by other tables`);
        return;
      }

      for (const indexFile of table.indexFiles) {
        const collectionName = indexFile.indexName;
        try {
          const collection = client.db(currentDatabase).collection(collectionName);
          await collection.drop();
        } catch (error) {
          socket.write(`ERROR: Could not drop index collection ${collectionName}`);
        }
      }

      const tableFileName = table.fileName;
      try {
        const tableCollection = client.db(currentDatabase).collection(tableFileName);
        await tableCollection.drop();
      } catch (error) {
        socket.write(`ERROR: Could not drop table collection ${tableFileName}`);
        return;
      }

      db.tables.splice(tableIndex, 1);
      saveCatalog();

      socket.write(`Table ${tableName} dropped`);
    } else {
      socket.write(`ERROR: No database selected`);
    }
  }
}

function handleUse(command, socket) {
  const dbName = command[1];
  if (catalog.databases.find(db => db.dataBaseName === dbName)) {
    currentDatabase = dbName;
    socket.write(`Using database ${dbName}`);
  } else {
    socket.write(`ERROR: Database ${dbName} does not exist`);
  }
}

async function handleCreateIndex(command, socket) {
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

function listDatabases(socket) {
  const dbNames = catalog.databases.map(db => db.dataBaseName);
  if (dbNames.length === 0) {
    socket.write(`No databases available.`);
  } else {
    socket.write(`Databases:\n${dbNames.join('\n')}`);
  }
}

function listTables(socket) {
  if (currentDatabase) {
    const db = catalog.databases.find(db => db.dataBaseName === currentDatabase);
    const tableNames = db.tables.map(t => t.tableName);
    if (tableNames.length === 0) {
      socket.write(`No tables in database ${currentDatabase}.`);
    } else {
      socket.write(`Tables in database ${currentDatabase}:\n${tableNames.join('\n')}`);
    }
  } else {
    socket.write(`ERROR: No database selected.`);
  }
}

function saveCatalog() {
  fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 4));
}
