require('dotenv').config();

const express = require('express');
const { Activity } = require('react');
const app = express();
const morgan = require('morgan');
const cors = require('cors');3
const OpenAI = require('openai');
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY,
});

app.get('/', (req, res, next) => {
    res.json('hi guys, server is running! welcome to the main page');
});

app.get('/user', (req,res) => {
    res.json('profiles page');

});
app.get('/user/:id', (req,res,next) => {
    console.log('ID: ', req.params.id);
    next();
}, (req, res, next) => {
    res.send(`Name: ${req.params.id}`);
});

app.post("/api/chat", async (req, res) =>{
   try{
    const { message } = req.body;

    const response = await client.responses.create({
        model : "gpt-5-mini",
        input: message,
    });

    const reply = response.output_text;

    res.json({ reply });
   }
   catch(error){
    console.error(error);
    res.status(500).json({ error: "Something went wrong"});
   }
});

// MediaPipe Pose Detection Endpoint
app.post("/api/pose", async (req, res) => {
  try {
    const { landmarks, angles, timestamp, sessionTime, metrics } = req.body;

    // Log pose data for now
    console.log(`[${new Date(timestamp).toISOString()}] Pose detected:`, {
      leftKnee: angles.leftKnee,
      rightKnee: angles.rightKnee,
      leftHip: angles.leftHip,
      rightHip: angles.rightHip,
      sessionTime: sessionTime
    });

    // Here you can:
    // 1. Store pose data in a database
    // 2. Analyze biomechanics and generate feedback
    // 3. Track rep counting and form quality
    // 4. Send real-time feedback back to frontend

    res.json({
      status: 'ok',
      message: 'Pose data received',
      timestamp
    });
  } catch (error) {
    console.error('Pose endpoint error:', error);
    res.status(500).json({ error: 'Failed to process pose data' });
  }
});

app.post('/', (req,res, next) =>{
    const newUser = req.body;
    users.push(newUser);
    res.status(201).send("User created");
});

let users  = [
    {users:'maya', content: "idkbruhjusttesting"},
    {users:'ohm', content: "same"},
    {users:'elizabeth', content: "hello"},
    {users:'jonny', content: "idksmthross"},
    {users:'martin', content: "notreallysure"},
    {users: 'avi', content: "smthecon"}
]


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

//put route
app.put('/user/:id', (req, res) => {
    const userId = req.params.id;
    const updatedData = req.body;

    const userIndex = users.findIndex(user => user.users === userId);

    if (userIndex === -1) {
        return res.status(404).json({ message: `User '${userId}' not found` });
    }

    users[userIndex] = { ...users[userIndex], ...updatedData };

    res.status(200).json({
        message: `User '${userId}' updated successfully`,
        updatedUser: users[userIndex]
    });
});

// delete route
app.delete('/user/:id', (req, res, next) => {
    console.log('Attempting to delete user: ', req.params.id);
    next();
}, (req, res, next) => {
    const username = req.params.id;

    const userIndex = users.findIndex(u => u.users === username);

    if (userIndex === -1) {
        return res.status(404).send(`User ${username} not found`);
    }

    const deletedUser = users.splice(userIndex, 1);

    res.status(200).json({
        message: `User deleted successfully`,
        deleted: deletedUser[0]
    });
});

