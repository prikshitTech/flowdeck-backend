import app from './app.js';

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
  process.stdout.write(`flowdeck api listening on ${port}\n`);
});
