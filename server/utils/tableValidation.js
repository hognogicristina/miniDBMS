const {catalog} = require("../db/catalog");
const {isValidDataType, isValidColumnModifier} = require("./dataValidation");
const {getCurrentDatabase} = require("../db/dbState");

function checkTableName(currentDatabase, tableName) {
  if (!tableName) return `ERROR: Table name required`;
  const dbEntry = catalog.databases.find(db => db.dataBaseName === currentDatabase);
  if (!dbEntry) return `ERROR: No database selected`;
  if (dbEntry.tables.find(table => table.tableName === tableName)) return `ERROR: Table ${tableName} already exists in database ${currentDatabase}`;
  return null;
}

function checkTableExists(currentDatabase, tableName) {
  const db = catalog.databases.find(db => db.dataBaseName === currentDatabase);
  if (!db) return `ERROR: No database selected`;
  const tableIndex = db.tables.findIndex(t => t.tableName === tableName);
  return tableIndex === -1 ? `ERROR: Table ${tableName} does not exist in database ${currentDatabase}` : tableIndex;
}

function validateColumnDefinitions(dbEntry, columnDefinitions) {
  const columns = [];
  const primaryKey = [];
  const foreignKeys = [];
  const columnNames = new Set();

  for (const definition of columnDefinitions.split(',')) {
    const parts = definition.trim().split(' ');
    const columnName = parts[0];
    const columnType = parts[1];
    const columnLength = parts[2] ? parseInt(parts[2], 10) : null;

    if (columnNames.has(columnName)) return `ERROR: Duplicate column name ${columnName}`;
    if (!isValidDataType(columnType, columnLength)) return `ERROR: Invalid data type for column ${columnName}`;

    for (const part of parts) {
      if (part !== columnName && part !== columnType && !Number.isInteger(columnLength)) {
        if (part.startsWith('foreign=')) {
          const [refTable, refColumn] = part.split('=')[1].split('.');
          const referencedTable = dbEntry.tables.find(t => t.tableName === refTable);
          if (!referencedTable) return `ERROR: Referenced table ${refTable} does not exist`;
          if (!referencedTable.structure.attributes.some(attr => attr.attributeName === refColumn)) return `ERROR: Referenced column ${refColumn} does not exist in table ${refTable}`;
          foreignKeys.push({fkAttributes: [columnName], references: {refTable, refAttributes: [refColumn]}});
        } else if (!isValidColumnModifier(part)) {
          return `ERROR: Invalid column modifier "${part}" in column ${columnName}`;
        }
      }
    }

    columnNames.add(columnName);
    const column = {attributeName: columnName, type: columnType, length: columnLength};
    if (parts.includes('primary')) primaryKey.push(columnName);
    columns.push(column);
  }

  if (columns.length === 0) return `ERROR: At least one column is required`;
  if (primaryKey.length === 0) return `ERROR: Primary key is required`;

  return {columns, primaryKey, foreignKeys};
}

function checkForeignKeyReferences(db, tableName) {
  const foreignKeyCheck = db.tables.some(t => t.foreignKeys.some(fk => fk.references.refTable === tableName));
  return foreignKeyCheck ? `ERROR: Cannot drop table ${tableName}, it is referenced by other tables` : null;
}

function findTable(tableName) {
  const currentDatabase = getCurrentDatabase();
  const db = catalog.databases.find(db => db.dataBaseName === currentDatabase);
  const table = db.tables.find(t => t.tableName === tableName);

  if (!table) {
    return `ERROR: Table ${tableName} does not exist in database ${currentDatabase}`;
  } else {
    return table;
  }
}

function checkColumnExists(table, tableName, columnName) {
  const columnExists = table.structure.attributes.some(attr => attr.attributeName === columnName);
  if (!columnExists) {
    return `ERROR: Column ${columnName} does not exist in table ${tableName}`;
  }
}

async function checkForDuplicatePrimaryKey(collection, primaryKey) {
  const existing = await collection.findOne({_id: primaryKey});
  if (existing) {
    return `ERROR: Primary key ${primaryKey} already exists.`;
  }
}

module.exports = {
  checkTableName,
  checkTableExists,
  validateColumnDefinitions,
  checkForeignKeyReferences,
  findTable,
  checkColumnExists,
  checkForDuplicatePrimaryKey
};