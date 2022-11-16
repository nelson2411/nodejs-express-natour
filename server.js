const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

const app = require('./app');

// 3) Start the server
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
