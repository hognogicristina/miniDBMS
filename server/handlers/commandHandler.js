const { handleCreate } = require('./database/createHandler');
const { handleDrop } = require('./database/dropHandler');
const { listDatabases, listTables } = require('./listHandler');
const { handleUse } = require('./database/useHandler');
const { handleCreateIndex } = require('./database/indexHandler');
const { handleInsert } = require('./operations/insertHandler');
const { handleDelete } = require('./operations/deleteHandler');

async function handleCommand(command, socket) {
  const cmd = command[0].toLowerCase();
  switch (cmd) {
    case 'create':
      if (command[1].toLowerCase() === 'database' || command[1].toLowerCase() === 'table') {
        await handleCreate(command, socket);
      } else if (command[1].toLowerCase() === 'index' || (command[1].toLowerCase() === 'unique' && command[2].toLowerCase() === 'index')) {
        await handleCreateIndex(command, socket);
      } else {
        socket.write(`ERROR: Invalid syntax. Use "create database", "create table", or "create [unique] index".`);
      }
      break;
    case 'drop':
      if (command[1].toLowerCase() === 'database' || command[1].toLowerCase() === 'table') {
        await handleDrop(command, socket);
      } else {
        socket.write(`ERROR: Invalid syntax. Use "drop database" or "drop table".`);
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
    case 'insert':
      await handleInsert(command, socket);
      break;
    case 'delete':
      await handleDelete(command, socket);
      break;
    default:
      socket.write('ERROR: Invalid command');
      break;
  }
}

module.exports = { handleCommand };