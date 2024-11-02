const {client} = require("../../db/mongoConnection");
const {getCurrentDatabase} = require("../../db/dbState");
const {checkDatabaseSelection} = require("../../utils/databaseValidation");
const {findTable, checkColumnExists} = require("../../utils/tableValidation");
const {checkDeleteCommand, checkDeleteColumn, validateEmptyVarcharChar, missingPKValueError} = require("../../utils/commandValidation");

async function handleDelete(command, socket) {
  const currentDatabase = getCurrentDatabase();
  const dbError = checkDatabaseSelection();
  if (dbError) {
    socket.write(dbError);
    return;
  }

  const tableName = command[2];
  const table = findTable(tableName);
  if (typeof table === "string") {
    socket.write(table);
    return;
  }

  const deleteCommandError = checkDeleteCommand(command);
  if (deleteCommandError) {
    socket.write(deleteCommandError);
    return;
  }

  const primaryKey = table.primaryKey.pkAttributes;

  const conditionString = command.slice(4).join(" ");
  const conditions = conditionString.split("and").map(cond => cond.trim());

  const conditionMap = {};
  for (let condition of conditions) {
    const [col, val] = condition.split("=").map(s => s.trim());
    conditionMap[col] = val.replace(/^'|'$/g, "");

    const columnExistsError = checkColumnExists(table, tableName, col);
    if (columnExistsError) {
      socket.write(columnExistsError);
      return;
    }

    const deleteColumnError = checkDeleteColumn(primaryKey, col);
    if (deleteColumnError) {
      socket.write(deleteColumnError);
      return;
    }
  }

  const missingError = missingPKValueError(primaryKey, conditionMap);
  if (missingError) {
    socket.write(missingError);
    return;
  }

  const pkValidationError = validateEmptyVarcharChar(conditionMap, table);
  if (pkValidationError) {
    socket.write(pkValidationError);
    return;
  }

  const pkValue = primaryKey.map(key => conditionMap[key].replace(/^'|'$/g, "")).join("#");

  try {
    const collection = client.db(currentDatabase).collection(table.fileName);
    const filter = {_id: pkValue};

    const deleteResult = await collection.deleteOne(filter);
    if (deleteResult.deletedCount === 1) {
      socket.write(`Deleted from table ${tableName}`);
    } else {
      socket.write("ERROR: No data found with the given primary key");
    }
  } catch (error) {
    socket.write("ERROR: Delete operation failed");
  }
}

module.exports = {handleDelete};