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

module.exports = { isValidDataType, isValidColumnModifier };
