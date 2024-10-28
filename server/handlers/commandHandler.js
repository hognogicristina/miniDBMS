const {handleCreate} = require('./database/createHandler');
const {handleDrop} = require('./database/dropHandler');
const {listDatabases, listTables} = require('./listHandler');
const {handleUse} = require('./database/useHandler');
const {handleCreateIndex} = require('./database/indexHandler');

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

module.exports = {handleCommand};
