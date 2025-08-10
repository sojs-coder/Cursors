import express from 'express';
import path from 'path';
const app = express();
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});


export { app };