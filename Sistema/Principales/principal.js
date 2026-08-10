const { cargarCaches } = require('../principal/Esquemas/esquemas');
const { procesarMensaje } = require('../principal/Manejadores/manejador');
const { verificarUnionGrupo } = require('../principal/Eventos/eventos');

cargarCaches();

module.exports = { procesarMensaje, verificarUnionGrupo };
