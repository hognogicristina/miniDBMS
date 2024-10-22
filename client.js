const net = require('net');
const readline = require('readline');

const client = new net.Socket();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

client.connect(8989, '127.0.0.1', () => {
  console.log('Connected to the server');
  askCommand();
});

client.on('data', (data) => {
  const message = data.toString().trim();
  console.log('Server response: ' + message);

  if (message.toLowerCase() === 'exit') {
    console.log('Exiting...');
    client.end();
    rl.close();
  } else {
    askCommand();
  }
});

client.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

function askCommand() {
  rl.question('Enter command: ', (command) => {
    if (command === 'exit') {
      client.write(command);
      client.end();
      rl.close();
    } else {
      client.write(command);
    }
  });
}