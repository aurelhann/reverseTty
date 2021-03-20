import WebSocket from 'ws';
import terminal from 'terminal-kit';
import yargs from 'yargs';

const term = terminal.terminal();
const argv = yargs().argv;
const HOST = argv.host || '127.0.0.1';
const PORT = argv.port || '8080';
const PATH = argv.path || '/toto'

// Const declaration
const DEFAULT_CLIENT = argv.uid || '';

class TerminalX {
    constructor(uid) {
        this.UID = uid;
        this.settings = {
            mainUrl: `ws://${HOST}${PORT?`:${PORT}`:''}${PATH}`,
            user: 'preprodMaster',
            password: 'fuckingInsaneFrenchies'
        };
        this.histoCommands = [];
        this.promptTemplate = `${this.UID}>`;
        term.yellow('Welcome to reversTTy !!\n');
        term.yellow('Type "exit" to exit\n');
    }

    input() {
        const self = this;
        term.inputField(
            {
                history: this.histoCommands,
                autoComplete: self.histoCommands,
                autoCompleteHint: true,
                autoCompleteMenu: true,
                cursorPosition: this.promptTemplate.length
            },
            function (error, input) {
                term.blue('\n');
                if (input === 'exit') {
                    process.exit();
                } else {
                    if (input !== '') {
                        self.histoCommands.push(input);
                        self.ws.send(input + '\r');
                    } else {
                        term.blue(self.promptTemplate);
                    }
                    self.input();
                }
            }
        );
        term.on( 'key' , function( name , matches , data ) {
            if ( name === 'CTRL_C' ) { self.ws.send('\x03') }
        } ) ;
    }

    async createClient() {
        return new Promise((res, rej) => {
            this.ws = new WebSocket(this.settings.mainUrl, [], {
                headers: {
                    // eslint-disable-next-line max-len
                    'term-authorization': `Basic ${Buffer.from(`${this.settings.user}:${this.settings.password}`).toString('base64')}`
                }
            });

            this.ws.on('open', () => {
                term.yellow(`Connected to ${this.settings.mainUrl}\n`);
                term.blue(this.promptTemplate);
                this.input();
                res();
            });

            this.ws.on('error', (err) => {
                term.yellow(`Error ${err}\n`);
            });

            this.ws.on('close', (code) => {
                term.yellow(`Web socket close ${code}\n`);
                rej(new Error('Web socket closed'));
            });

            this.ws.on('message', async (data) => {
                try {
                    console.log(data)
                    let data1 = '';
                    if (Buffer.isBuffer(data)) {
                        data1 = data.toString();
                    } else {
                        data1 = JSON.parse(data);
                    }
                    if (data1.out || data1.err) {
                        term.green(data1.out + '\n');
                        term.red(data1.err + '\n');
                        term.blue(this.promptTemplate);
                    } else {
                        // We recieve empty messages for each duplicated listener (seems like)
                        // term.yellow(JSON.stringify(data1) + '\n');
                    }
                } catch (e) {
                    // nothing
                    console.log(data);
                }
            });
        }).catch(err => {
            term.red('error', `Error to connect websocket ${err}`);
        });
    }
}

const toto = new TerminalX(DEFAULT_CLIENT);
toto.createClient();
