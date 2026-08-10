const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const conectarDB = require('./sistema/Principales/datos');
const readline = require('readline');

const { procesarMensaje, verificarUnionGrupo } = require('./sistema/Principales/principal');

global.historialMensajes = global.historialMensajes || {};
global.plugins = global.plugins || {};

const obtenerEntrada = (mensajePrompt) => {
    return new Promise((resolve) => {
        console.log(mensajePrompt);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('> ', (respuesta) => {
            rl.close();
            resolve(respuesta.trim());
        });
    });
};

async function iniciarBot() {
    await conectarDB();

    const { state, saveCreds } = await useMultiFileAuthState('auth_tamaki');
    const { version } = await fetchLatestBaileysVersion();

    let usarCodigoVinculacion = false;
    let numeroTelefono = '';

    if (!state.creds.registered) {
        console.log('\n======================================');
        console.log('¿Cómo quieres vincular la Bot?');
        console.log('1. Con código QR tradicional');
        console.log('2. Con código de 8 dígitos');
        console.log('======================================\n');
        
        const opcion = await obtenerEntrada('Escribe 1 o 2 abajo y presiona Enter:');

        if (opcion === '2') {
            usarCodigoVinculacion = true;
            const numInput = await obtenerEntrada('\n✍️ Ingresa el número (ej: 521234567890):');
            numeroTelefono = numInput.replace(/[^0-9]/g, '');
        }
    }

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Chrome'), 
        shouldSyncHistoryMessage: () => false
    });

    sock.ev.on('creds.update', saveCreds);

    if (!fs.existsSync('./comandos')) fs.mkdirSync('./comandos');

    const cargarPlugins = () => {
        let contador = 0;
        const leerDirectorio = (dir) => {
            const archivos = fs.readdirSync(dir);
            for (const archivo of archivos) {
                const rutaCompleta = path.join(dir, archivo);
                if (fs.statSync(rutaCompleta).isDirectory()) {
                    leerDirectorio(rutaCompleta);
                } else if (archivo.endsWith('.js')) {
                    try {
                        const rutaAbsoluta = path.resolve(rutaCompleta);
                        delete require.cache[require.resolve(rutaAbsoluta)];
                        const comand = require(rutaAbsoluta);
                        
                        if (comand && comand.name) {
                            global.plugins[comand.name] = comand;
                            contador++;
                        }
                    } catch (err) {
                        console.log(`❌ Error cargando comando en ${archivo}:`, err.message);
                    }
                }
            }
        };
        leerDirectorio('./comandos');
        console.log('⛔️  ' + contador + ' Comandos cargados correctamente.');
    };

    cargarPlugins();

    let codigoSolicitado = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (usarCodigoVinculacion && !state.creds.registered && !codigoSolicitado && (connection === 'connecting' || qr)) {
            codigoSolicitado = true;
            try {
                console.log('⏳ Solicitando código...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                let code = await sock.requestPairingCode(numeroTelefono);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                
                console.log('\n==================================================');
                console.log(`🔑 TU CÓDIGO DE VINCULACIÓN ES: \x1b[32m${code}\x1b[0m`);
                console.log('==================================================');
                console.log('🔔 Ingresa el codigo: La notificación push de WhatsApp ya no llega para introducir este código.\n');
            } catch (error) {
                console.error('❌ Error al generar el código de vinculación:', error);
                codigoSolicitado = false;
            }
        }

        if (qr && !usarCodigoVinculacion) {
            console.log('🪧 ESCANEA EL CÓDIGO QR CON TU WHATSAPP:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const razon = new Boom(lastDisconnect?.error)?.output.statusCode;
            if (razon === DisconnectReason.loggedOut) {
                console.log('❌ Sesión cerrada. Elimina la carpeta auth_tamaki y escanea de nuevo.');
            } else {
                console.log(`⚠️ Conexión perdida. Reconectando automáticamente...`);
                setTimeout(() => iniciarBot(), 3000);
            }
        } else if (connection === 'open') {
            console.log('🔥  Tamaki Kotatsu conectada con éxito.');
        }
    });

    sock.ev.on('group-participants.update', async (update) => {
        await verificarUnionGrupo(sock, update);
    });

    sock.ev.on('messages.upsert', async chatUpdate => {
        await procesarMensaje(sock, chatUpdate);
    });
}

iniciarBot();
