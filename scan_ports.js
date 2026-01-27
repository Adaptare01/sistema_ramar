import net from 'net';

const startPort = 5430;
const endPort = 5440;

const checkPort = (port) => {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(200);

        socket.on('connect', () => {
            console.log(`[FOUND] Porta aberta detectada: ${port}`);
            socket.destroy();
            resolve(port);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(null);
        });

        socket.on('error', (err) => {
            socket.destroy();
            resolve(null);
        });

        socket.connect(port, '127.0.0.1');
    });
};

const scan = async () => {
    console.log(`Iniciando varredura de portas ${startPort}-${endPort}...`);
    for (let port = startPort; port <= endPort; port++) {
        await checkPort(port);
    }
    console.log('Varredura concluída.');
};

scan();
