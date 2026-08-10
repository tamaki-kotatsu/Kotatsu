const mongoose = require('mongoose');

const link = "";

const conectarDB = async () => {
    try {
        await mongoose.connect(link);
        console.log('♻️  Base de datos conectada con éxito');
    } catch (e) {
        console.log('❌ [DATABASE] Error de conexión: ' + e);
    }
};

module.exports = conectarDB;
