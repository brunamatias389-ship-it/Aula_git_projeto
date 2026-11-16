import express from 'express';

const app = express();

app.use(express.static('public'));
app.get('/', (_, res) => {
  res.send('Hello, Git!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;