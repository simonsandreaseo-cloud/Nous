const fs = require('fs');
const path = require('path');

const runFile = path.join(__dirname, 'electron', 'logs', 'runs', 'run_1794071717271.json');
const run = JSON.parse(fs.readFileSync(runFile, 'utf8'));

console.log('Run Info:');
console.log('Total steps:', run.steps?.length);
console.log('Total tasks:', run.tasksTotal);

run.steps.forEach((s, i) => {
  console.log(`\n================ STEP ${i} ================`);
  console.log('Task index:', s.taskIndex);
  console.log('Task title:', s.taskTitle);
  console.log('Word count:', s.wordCount);
  console.log('Burstiness:', s.burstiness);
  console.log('Original length:', s.originalText?.length);
  console.log('Output length:', s.outputText?.length);
  if (s.thought) {
    console.log('Thought (first 200 chars):', s.thought.slice(0, 200).replace(/\n/g, ' '));
  }
});
