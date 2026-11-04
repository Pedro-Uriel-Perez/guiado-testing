'use strict';

const { app } = require('./app');
const { config } = require('./config');

app.listen(config.port, () => {
  console.log(`Task Manager API escuchando en http://localhost:${config.port}`);
});
