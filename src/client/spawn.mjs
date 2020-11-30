import childProcess from 'child_process';
import path from 'path';

function Spawn(stream, command, args, name, output) {
    const exited = false;
    const ended = false;

    let options;

    if (process.platform === 'win32') {
        options = {
            // required so that .bat/.cmd files can be spawned
            shell: process.env.comspec || 'cmd.exe'
        };
    }

    const spawnedProcess = childProcess.spawn(command, args, options);

    this.id = name;

    if (output) {
        spawnedProcess.stdout.pipe(output.stdin);
        spawnedProcess.stderr.pipe(output.stdin);
    }

    if (stream) {
        spawnedProcess.stdout.pipe(stream, {
            end: false
        });

        spawnedProcess.stderr.pipe(stream, {
            end: false
        });

        spawnedProcess.stdout.on('end', function() {
            ended = true;
            if (exited !== false) {
                stream.exit(exited);
            }
        });

        spawnedProcess.on('exit', function(code, signal) {
            exited = code;
            if (ended !== false) {
                stream.exit(exited);
            }
        });

        spawnedProcess.on('error', function() {
            stream.exit(1);
        });
    }

    process.on('exit', function(code) {
        if (exited === false) {
            // 'exit' callback cannot perform asynchronous work
            // therefore run standalone-treekill in a subprocess using spawnSync.
            // assuming standalone-treekill.js in same directory as Spawn.js
            const treeKillScriptPath = path.resolve(__dirname, 'standalone-treekill.js');
            const spawnOptions = { stdio: 'inherit' };
            childProcess.spawnSync(process.execPath, [treeKillScriptPath, spawnedProcess.pid], spawnOptions);
        }
    });

    return spawnedProcess;
}


export default Spawn;
