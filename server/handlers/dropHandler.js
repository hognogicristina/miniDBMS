const { client } = require('../db/mongoConnection');
const { saveCatalog, catalog } = require('../db/catalog');
const { getCurrentDatabase } = require('../db/dbState');

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
    const currentDatabase = getCurrentDatabase();
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
        const collectionName = `${currentDatabase}_${tableName}_idx_${indexFile.indexName}`;
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

module.exports = { handleDrop };
