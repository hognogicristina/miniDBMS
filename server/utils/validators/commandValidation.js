function parseCommandIndex(match) {
  if (!match) {
    return `ERROR: Invalid syntax. Use: "create index indexName [unique] on tableName columnName"`;
  }
}

function validateInsertCommand(match) {
  if (!match) {
    return `ERROR: Invalid syntax. Use: "insert into tableName column1 = value1, column2 = 'value2', ..."`;
  }
  return null;
}

function checkForDuplicateColumns(columns) {
  const columnSet = new Set();
  const duplicates = [];

  columns.forEach(col => {
    if (columnSet.has(col)) {
      duplicates.push(col);
    } else {
      columnSet.add(col);
    }
  });

  if (duplicates.length > 0) {
    return `ERROR: Duplicate column(s) found: ${duplicates.join(", ")}`;
  }

  return null;
}

function checkForDuplicateColumnsDelete(conditions) {
  const columns = conditions.map(cond => cond.split("=")[0].trim());
  const duplicates = [];
  const columnSet = new Set();

  columns.forEach(col => {
    if (columnSet.has(col)) {
      duplicates.push(col);
    } else {
      columnSet.add(col);
    }
  });

  if (duplicates.length > 0) {
    return `ERROR: Duplicate column found: ${duplicates.join(", ")}`;
  }

  return null;
}

function checkInsertCommand(command, tableColumns, fields) {
  const providedColumns = Object.keys(fields);
  const missingColumns = tableColumns.filter(col => !providedColumns.includes(col));
  const extraColumns = providedColumns.filter(col => !tableColumns.includes(col));

  if (missingColumns.length > 0) {
    return `ERROR: Missing column(s): ${missingColumns.join(", ")}`;
  } else if (extraColumns.length > 0) {
    return `ERROR: Extra column(s): ${extraColumns.join(", ")}`;
  }
}

function validateEmptyVarcharChar(commandText, table) {
  for (const attr of table.structure.attributes) {
    const columnName = attr.attributeName;
    const columnType = attr.type.toLowerCase();

    if (columnType === "varchar" || columnType === "char") {
      const regex = new RegExp(`${columnName}\\s*=\\s*'[^']*'`, 'i');
      if (!regex.test(commandText)) {
        return `ERROR: Column ${columnName} of type ${columnType.toUpperCase()} must be enclosed in single quotes.`;
      }
    }
  }
  return null;
}

function checkDeleteSyntax(command) {
  const conditionString = command.slice(4).join(" ");
  const conditions = conditionString.split("and").map(cond => cond.trim());
  for (let condition of conditions) {
    if (!condition.includes("=")) {
      return `ERROR: Invalid syntax. Use: "delete from tableName where columnName = value"`;
    }
  }
  return null;
}

function checkDeleteCommand(command) {
  if (command[3] !== "where") {
    return "ERROR: DELETE command must include a WHERE clause with the primary key";
  }
}

function checkDeleteColumn(primaryKey, col) {
  if (!primaryKey.includes(col)) {
    return `ERROR: Column ${col} is not part of the primary key`;
  }
}

function missingPKValueError(primaryKey, conditionMap) {
  const missingKeys = primaryKey.filter(key => !(key in conditionMap));
  if (missingKeys.length > 0) {
    return `ERROR: Missing primary key value(s): ${missingKeys.join(", ")}`;
  }
}

module.exports = {
  parseCommandIndex,
  validateInsertCommand,
  checkForDuplicateColumns,
  checkForDuplicateColumnsDelete,
  checkInsertCommand,
  validateEmptyVarcharChar,
  checkDeleteSyntax,
  checkDeleteCommand,
  checkDeleteColumn,
  missingPKValueError
};