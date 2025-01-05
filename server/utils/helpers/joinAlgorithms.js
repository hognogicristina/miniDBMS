const {client} = require("../../db/mongoConnection");

async function performJoin(mainTableData, joinTableData, joinType, onConditions, mainTable, joinTable, currentDatabase,  mainAlias, joinAlias) {
  let result;

  const [onCondition] = onConditions;
  const {left, right} = onCondition;

  const mainColumnName = left.split('.').pop();
  const joinColumnName = right.split('.').pop();

  const mainIsIndexed = mainTable.indexFiles.find((index) => index.indexAttributes.includes(mainColumnName));
  const joinIsIndexed = joinTable.indexFiles.find((index) => index.indexAttributes.includes(joinColumnName));

  if (mainIsIndexed && joinIsIndexed) {
    console.log("Using Indexed Nested Loop Join...");
    result = await indexedNestedLoopJoin(
      mainTableData,
      joinTable,
      joinColumnName,
      currentDatabase,
      joinAlias,
      mainAlias
    );
  } else {
    console.log("Using Sort-Merge Join...");
    result = sortMergeJoin(
      mainTableData,
      joinTableData,
      mainTable,
      joinTable,
      mainColumnName,
      joinColumnName,
      mainAlias,
      joinAlias
    );
  }


  return result;
}

async function indexedNestedLoopJoin(mainTableData, joinTable, joinColumnName, currentDatabase, joinAlias, mainAlias) {
  const joinResults = [];
  const db = client.db(currentDatabase);
  const joinCollection = db.collection(joinTable.fileName);

  for (const mainRow of mainTableData) {
    const mainParsedRow = extractFullRow(mainRow, joinTable, mainAlias);
    const mainValue = mainParsedRow[`${mainAlias}.${joinColumnName}`];

    if (!mainValue) {
      continue;
    }

    const joinRows = await joinCollection.find({ _id: mainValue }).toArray();

    if (joinRows.length > 0) {
      for (const joinRow of joinRows) {
        const joinParsedRow = extractFullRow(joinRow, joinTable, joinAlias);
        joinResults.push({ ...mainParsedRow, ...joinParsedRow });
      }
    }
  }

  return joinResults;
}

function sortMergeJoin(mainTableData, joinTableData, mainTable, joinTable, mainColumnName, joinColumnName, mainAlias, joinAlias) {
  const joinResults = [];

  const mainParsedData = mainTableData.map((row) => extractFullRow(row, mainTable, mainAlias));
  const joinParsedData = joinTableData.map((row) => extractFullRow(row, joinTable, joinAlias));

  mainParsedData.sort((a, b) => {
    const valueA = a[`${mainAlias}.${mainColumnName}`] || '';
    const valueB = b[`${mainAlias}.${mainColumnName}`] || '';
    return valueA.localeCompare(valueB);
  });

  joinParsedData.sort((a, b) => {
    const valueA = a[`${joinAlias}.${joinColumnName}`] || '';
    const valueB = b[`${joinAlias}.${joinColumnName}`] || '';
    return valueA.localeCompare(valueB);
  });

  let i = 0, j = 0;

  while (i < mainParsedData.length && j < joinParsedData.length) {
    const mainValue = mainParsedData[i][`${mainAlias}.${mainColumnName}`];
    const joinValue = joinParsedData[j][`${joinAlias}.${joinColumnName}`];

    if (mainValue === joinValue) {
      joinResults.push({ ...mainParsedData[i], ...joinParsedData[j] });
      i++;
      j++;
    } else if (mainValue < joinValue) {
      i++;
    } else {
      j++;
    }
  }

  return joinResults;
}

function extractFullRow(document, table, alias) {
  const attributes = table.structure.attributes.map((attr) => attr.attributeName);
  const pkAttributes = table.primaryKey.pkAttributes;

  const pkValues = document._id.split('$');
  const valueParts = document.value.split('#');

  const row = {};
  let valueIndex = 0;

  attributes.forEach((attr, idx) => {
    const prefixedAttr = `${alias}.${attr}`;
    if (pkAttributes.includes(attr)) {
      row[prefixedAttr] = pkValues[pkAttributes.indexOf(attr)];
    } else {
      row[prefixedAttr] = valueParts[valueIndex];
      valueIndex++;
    }
  });

  return row;
}


module.exports = {performJoin};