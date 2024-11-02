const {client} = require('../../db/mongoConnection');
const {getCurrentDatabase} = require("../../db/dbState");
const {checkDatabaseSelection} = require("../../utils/databaseValidation");
const {findTable, checkForDuplicatePrimaryKey} = require("../../utils/tableValidation");
const {checkInsertCommand} = require("../../utils/commandValidation");
const {validateInsertCommand, validateInsertLength, validateEmptyVarcharChar} = require("../../utils/commandValidation");

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

  const insertErrorCommand = validateInsertCommand(command, tableName);
  if (insertErrorCommand) {
    socket.write(insertErrorCommand);
    return;
  }

  const commandText = command.join(" ");
  const match = commandText.match(/insert\s+into\s+\w+\s*\(([^)]+)\)\s+values\s*\(([^)]+)\)/i);

  const columns = match[1].split(",").map(col => col.trim());
  const values = match[2].split(",").map(val => val.trim());

  const insertErrorLength = validateInsertLength(columns, values);
  if (insertErrorLength) {
    socket.write(insertErrorLength);
    return;
  }

  const fields = {};
  columns.forEach((col, index) => {
    fields[col] = values[index];
  });

  const emptyValueError = validateEmptyVarcharChar(fields, table);
  if (emptyValueError) {
    socket.write(emptyValueError);
    return;
  }

  for (const key in fields) {
    fields[key] = fields[key].replace(/^'|'$/g, "");
  }

  const tableColumns = table.structure.attributes.map(attr => attr.attributeName);
  const insertError = checkInsertCommand(command, tableColumns, fields);
  if (insertError) {
    socket.write(insertError);
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