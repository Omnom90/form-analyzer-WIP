require('dotenv').config();

const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');
const OpenAI = require('openai');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const PORT = process.env.PORT || 3000;

const perIpLimiter = new RateLimiterMemory({ points: 5, duration: 300 });
const globalLimiter = new RateLimiterMemory({ points: 25, duration: 60 });

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

        try {
            await perIpLimiter.consume(req.ip);
        } catch {
            return res.status(429).json({ error: "Too many requests. Take a breather and try again." });
        }
        try {
            await globalLimiter.consume('global');
        } catch {
            return res.status(429).json({ error: "Server is busy. Try again in a moment." });
        }

        const { setNumber, repsCompleted, exercise, averageAngles } = req.body;
        const f = (v) => v != null ? `${Number(v).toFixed(1)}°` : 'not tracked';

        const prompt = exercise === 'pushup' ? `You are Rishane Oak coaching someone through a push-up. Same direct, honest approach.

Set ${setNumber} — Reps completed: ${repsCompleted}

USER'S MOVEMENT DATA:
- Left elbow: ${f(averageAngles.leftElbow)}
- Right elbow: ${f(averageAngles.rightElbow)}
- Elbow asymmetry (left vs right): ${Math.abs((averageAngles.leftElbow ?? 0) - (averageAngles.rightElbow ?? 0)).toFixed(1)}°
- Elbow flare angle: not tracked
- Hip position: not tracked
- Chest depth: not tracked
- Shoulder elevation: not tracked

COACHING LOGIC:
1. ASSESS OVERALL FORM QUALITY:
   - Perfect = 45° elbows, chest near floor, straight line, shoulders relaxed
   - Good = minor alignment issue but strong, controlled movement
   - Okay = multiple small compensations, needs focus
   - Poor = sagging hips, flared elbows, or half reps

2. HONEST ASSESSMENT:
   - If form is clean: "That's the rep. Perfect line."
   - If form is good with one fix: State what's working, then one cue.
   - If form is shaky: "Nice try. One thing that'll clean this up."
   - If form is sloppy: "You're struggling with form. Let's dial it back or fix this."

3. PRIORITY RULE - IDENTIFY THE ONE THING:
   - Most critical: Sagging hips > Flared elbows > Partial ROM > Asymmetry
   - One cue only.

4. SPEAK IN BODY LANGUAGE — no jargon. Say "hips dropping", "tuck your elbows", "get your chest closer to the ground".

5. FORMAT: Brief acknowledgment + One cue + Direction. 2-3 sentences max.`

        : `You are Rishane Oak coaching someone through a squat. Direct, honest, focused on what actually matters.

Set ${setNumber} — Reps completed: ${repsCompleted}

USER'S MOVEMENT DATA:
- Left knee: ${f(averageAngles.leftKnee)}
- Right knee: ${f(averageAngles.rightKnee)}
- Left hip: ${f(averageAngles.leftHip)}
- Right hip: ${f(averageAngles.rightHip)}
- Knee asymmetry (left vs right): ${Math.abs((averageAngles.leftKnee ?? 0) - (averageAngles.rightKnee ?? 0)).toFixed(1)}°
- Torso forward lean: not tracked
- Pelvis tuck (butt wink): not tracked

COACHING LOGIC:
1. ASSESS OVERALL FORM QUALITY:
   - Perfect = knees 85-110°, symmetric, neutral spine, weight in heels
   - Good = minor issues but safe movement pattern
   - Okay = multiple issues, but fixable
   - Poor = dangerous compensation patterns or very shallow/unstable

2. HONEST ASSESSMENT (not false praise):
   - If form is solid: "That's clean. Keep going."
   - If good with one fixable issue: Acknowledge what's working, then cue the one thing.
   - If mediocre: "Nice try. One thing to fix before we load this up."
   - If bad: "Not quite yet."

3. PRIORITY RULE - IDENTIFY THE ONE THING:
   - Most dangerous first: Excessive forward lean > knee valgus > butt wink > asymmetry > depth
   - One cue. Done.

4. SPEAK IN BODY LANGUAGE — no jargon. Say "knees caving", "chest up", "push knees out", "weight shifting to your toes".

5. FORMAT: Acknowledgment (if earned) + One cue + Try again or keep going. 2-3 sentences max.`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
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
