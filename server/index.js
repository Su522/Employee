require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('Automated Scheduling System API');
});

// Import routes (To be implemented)
// const employeeRoutes = require('./routes/employees');
// app.use('/api/employees', employeeRoutes);

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
