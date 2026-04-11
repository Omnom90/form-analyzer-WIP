require('dotenv').config();

const express = require('express');
const { Activity } = require('react');
const app = express();
const morgan = require('morgan');
const cors = require('cors');
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

//
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

app.post("/api/pose", async (req, res) => {
    
    console.log("Received payload:", req.body);
    try{
        const {setNumber, repsCompleted, exercise, averageAngles} = req.body;
        const anglesList = Object.entries(averageAngles).map(([angleName, value]) => `Average ${angleName}: ${value}`).join('\n');
        const userMessage = `
            Set ${setNumber} ${exercise} Results:
            Reps completed: ${repsCompleted}
            ${anglesList}

            Please analyze the user's form based on the provided angles and reps, and give them feedback on how to improve their form for the next set.
            `;

        const response = await client.chat.completions.create({
            model : "gpt-4-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a personal trainer analyzing your clients joint angles for exercises on a per set basis and providing catered feedback and encouragement to help them improve their form and prevent injury. Provide positive reinforcement along with the dedicated information, explaining any terms that they may not know. You are to create this feedback that will then be fed to them immediately and help them improve before their next set."
                },
                {
                    role: "user",
                    content: userMessage
                }
            ]
        })
        res.json({feedback: response.choices[0].message.content});
    }
    catch(error){
        res.status(500).json({ error: "Failed to provide pose analysis" });
    }
});

