const express = require('express');
const { json } = require('express/lib/response');
const fs = require('fs');

const app = express();
app.use(express.json());

const port = 3000;

/*
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Hello World!', app: 'My Express App' });
});

app.post('/', (req, res) => {
  res.status(200).json({ message: 'Got a POST request', status: 200 });
});
*/

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`, 'utf-8')
);

app.get('/api/v1/tours', (req, res) => {
  // we use the json status format to send the data
  res.status(200).json({
    // We can also send the status code as a number
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
});

app.post('/api/v1/tours', (req, res) => {
  const newId = tours[tours.length - 1].id + 1;
  const newTour = Object.assign({ id: newId }, req.body);

  tours.push(newTour);

  fs.writeFile(
    `${__dirname}/dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    (err) => {
      res.status(201).json({
        status: 'success',
        data: {
          tour: newTour,
        },
      });
    }
  );
});

app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
