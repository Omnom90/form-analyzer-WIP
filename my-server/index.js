require('dotenv').config();

const express = require('express');
const { Activity } = require('react');
const app = express();
const morgan = require('morgan');
const cors = require('cors');3
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

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
