require('dotenv').config();   // must run before anything reads process.env
const app = require('./app');

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
