require('dotenv').config();

const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');
const OpenAI = require('openai');
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

const groqKey = process.env.GROQ_API_KEY;
const groq = groqKey ? new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' }) : null;

app.get('/', (req, res) => {
    res.json('hi guys, server is running! welcome to the main page');
});

app.get('/user', (req, res) => {
    res.json('profiles page');
});

app.get('/user/:id', (req, res, next) => {
    console.log('ID: ', req.params.id);
    next();
}, (req, res) => {
    res.send(`Name: ${req.params.id}`);
});

app.post('/', (req, res) => {
    const newUser = req.body;
    users.push(newUser);
    res.status(201).send("User created");
});

let users = [
    { users: 'maya', content: "idkbruhjusttesting" },
    { users: 'ohm', content: "same" },
    { users: 'elizabeth', content: "hello" },
    { users: 'jonny', content: "idksmthross" },
    { users: 'martin', content: "notreallysure" },
    { users: 'avi', content: "smthecon" }
];

app.put('/user/:id', (req, res) => {
    const userId = req.params.id;
    const updatedData = req.body;
    const userIndex = users.findIndex(user => user.users === userId);
    if (userIndex === -1) {
        return res.status(404).json({ message: `User '${userId}' not found` });
    }
    users[userIndex] = { ...users[userIndex], ...updatedData };
    res.status(200).json({ message: `User '${userId}' updated successfully`, updatedUser: users[userIndex] });
});

app.delete('/user/:id', (req, res, next) => {
    console.log('Attempting to delete user: ', req.params.id);
    next();
}, (req, res) => {
    const username = req.params.id;
    const userIndex = users.findIndex(u => u.users === username);
    if (userIndex === -1) {
        return res.status(404).send(`User ${username} not found`);
    }
    const deletedUser = users.splice(userIndex, 1);
    res.status(200).json({ message: `User deleted successfully`, deleted: deletedUser[0] });
});

app.post("/api/pose", async (req, res) => {
    console.log("Received payload:", req.body);
    try {
        if (!groq) {
            return res.status(503).json({ error: "GROQ_API_KEY is not set in my-server/.env" });
        }

        const { setNumber, repsCompleted, exercise, averageAngles } = req.body;
        const anglesList = Object.entries(averageAngles)
            .map(([angleName, value]) => `  ${angleName}: ${Number(value).toFixed(1)}°`)
            .join('\n');

        const prompt = `You are a personal trainer giving quick, encouraging form feedback after a set.

Set ${setNumber} — ${exercise}
Reps completed: ${repsCompleted}
Average joint angles:
${anglesList}

Give 2-3 sentences of feedback: one positive observation, then one specific improvement cue for the next set. Plain language, no jargon.`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
        });
        const feedback = completion.choices[0].message.content;

        res.json({ feedback });
    } catch (error) {
        console.error("Pose analysis error:", error.message);
        res.status(500).json({ error: error.message ?? "Failed to provide pose analysis" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
