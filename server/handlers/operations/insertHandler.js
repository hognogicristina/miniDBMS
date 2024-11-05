const {client} = require('../../db/mongoConnection');
const {getCurrentDatabase} = require("../../db/dbState");
const {checkDatabaseSelection} = require("../../utils/databaseValidation");
const {findTable, checkForDuplicatePrimaryKey} = require("../../utils/tableValidation");
const {
  validateEmptyVarcharChar,
  validateInsertCommand,
  checkInsertCommand,
  checkForDuplicateColumns
} = require("../../utils/commandValidation");

async function handleInsert(command, socket) {
  const currentDatabase = getCurrentDatabase();
  const dbError = checkDatabaseSelection();
  if (dbError) {
    socket.write(dbError);
    return;
  }

  const tableName = command[2];
  const table = findTable(tableName);
  if (typeof table === 'string') return socket.write(table);

  const commandText = command.join(" ");
  const match = commandText.match(/insert\s+into\s+\w+\s+((\w+\s*=\s*[^,]+)(\s*,\s*\w+\s*=\s*[^,]+)*)/i);
  const insertErrorCommand = validateInsertCommand(match, tableName);
  if (insertErrorCommand) {
    socket.write(insertErrorCommand);
    return;
  }

  const fieldPairs = match[1].split(",").map(pair => pair.trim());
  const fields = {};
  const columns = [];

  fieldPairs.forEach(pair => {
    const [col, val] = pair.split("=").map(s => s.trim());
    columns.push(col);
    fields[col] = val.replace(/^'|'$/g, "");
  });

  const duplicateColumnError = checkForDuplicateColumns(columns);
  if (duplicateColumnError) {
    socket.write(duplicateColumnError);
    return;
  }

  const tableColumns = table.structure.attributes.map(attr => attr.attributeName);
  const insertError = checkInsertCommand(command, tableColumns, fields);
  if (insertError) {
    socket.write(insertError);
    return;
  }

  const emptyValueError = validateEmptyVarcharChar(commandText, table);
  if (emptyValueError) {
    socket.write(emptyValueError);
    return;
  }

  const primaryKey = table.primaryKey.pkAttributes;
  const pkValue = primaryKey.map(key => fields[key]).join("#");
  const nonPKColumns = tableColumns.filter(col => !primaryKey.includes(col));
  const value = nonPKColumns.map(col => fields[col]).join("#");

  const collection = client.db(currentDatabase).collection(table.fileName);
  const duplicateError = await checkForDuplicatePrimaryKey(collection, pkValue);
  if (duplicateError) {
    socket.write(duplicateError);
    return;
  }

  try {
    const document = {_id: pkValue};
    if (value) {
      document.value = value;
    }

    await collection.updateOne(
      {_id: pkValue},
      {$set: document},
      {upsert: true}
    );

    socket.write(`Inserted into table ${tableName}`);
  } catch (error) {
    socket.write("ERROR: Insert operation failed");
  }
}

module.exports = {handleInsert};