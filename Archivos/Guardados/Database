const mongoose = require('mongoose');

const link = "mongodb+srv://valen_adrian:32953738@cluster0.lq44gss.mongodb.net/?retryWrites=true&w=majority&appName=Proyecto1";

const conectarDB = async () => {
    try {
        await mongoose.connect(link);
        console.log('🩵  Base de datos conectada con éxito');
    } catch (e) {
        console.log('❌ [DATABASE] Error de conexión: ' + e);
    }
};

module.exports = conectarDB;
