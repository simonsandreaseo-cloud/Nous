const fs = require('fs');
const statePath = 'c:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/batch_state.json';
const tasks = JSON.parse(fs.readFileSync(statePath, 'utf8'));

if (tasks.length === 0) {
    console.log("EMPTY");
} else {
    const nextTask = tasks.shift();
    fs.writeFileSync(statePath, JSON.stringify(tasks, null, 2));
    console.log(nextTask);
}
