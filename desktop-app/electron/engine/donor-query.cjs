#!/usr/bin/env node
/**
 * CLI Tool for subagents to query human donors and perform isomorphic cloze mutations.
 */

const fs = require('fs');
const path = require('path');
const julian = require('./julian.cjs');

// Ensure bank is loaded
julian.loadBank();

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.error(JSON.stringify({ error: 'Command required: search, mutate, or diff' }));
  process.exit(1);
}

if (command === 'search') {
  // Usage: node donor-query.cjs search "query text" [--count N] [--maxWords W] [--type triads|duos|singles]
  const query = args[1] || '';
  const countIdx = args.indexOf('--count');
  const count = countIdx !== -1 ? parseInt(args[countIdx + 1], 10) : 3;

  const maxWordsIdx = args.indexOf('--maxWords');
  const maxWords = maxWordsIdx !== -1 ? parseInt(args[maxWordsIdx + 1], 10) : null;

  const matches = julian.findBestDonors(query, count * 2);
  let filtered = matches;
  if (maxWords) {
    filtered = matches.filter(m => m.words <= maxWords);
  }

  const results = (filtered.length > 0 ? filtered : matches).slice(0, count).map(m => ({
    id: m.id,
    type: m.type,
    domain: m.domain,
    tier: m.tier,
    words: m.words,
    text: m.text,
    hasGlitch: m.hasGlitch,
    isRare: m.isRare
  }));

  console.log(JSON.stringify({ query, count: results.length, donors: results }, null, 2));
  process.exit(0);
}

if (command === 'mutate') {
  // Usage: node donor-query.cjs mutate --donor "donor text" --target "target text"
  const donorIdx = args.indexOf('--donor');
  const targetIdx = args.indexOf('--target');

  if (donorIdx === -1 || targetIdx === -1) {
    console.error(JSON.stringify({ error: 'Both --donor and --target are required' }));
    process.exit(1);
  }

  const donorText = args[donorIdx + 1];
  const targetText = args[targetIdx + 1];

  let candidate = julian.applyDeterministicSlotFallback(donorText, targetText);
  candidate = julian.breakPlagiarismRuns(candidate);
  const diff = julian.computeWordMutation(donorText, candidate);

  console.log(JSON.stringify({
    donor: donorText,
    target: targetText,
    mutated: candidate,
    mutationPct: diff.mutationPct,
    preservedPct: diff.preservedPct,
    lengthRatio: diff.lengthRatio,
    isCompliant: diff.isCompliant
  }, null, 2));
  process.exit(0);
}

if (command === 'diff') {
  // Usage: node donor-query.cjs diff --donor "donor text" --candidate "candidate text"
  const donorIdx = args.indexOf('--donor');
  const candIdx = args.indexOf('--candidate');

  if (donorIdx === -1 || candIdx === -1) {
    console.error(JSON.stringify({ error: 'Both --donor and --candidate are required' }));
    process.exit(1);
  }

  const donorText = args[donorIdx + 1];
  const candText = args[candIdx + 1];

  const diff = julian.computeWordMutation(donorText, candText);
  console.log(JSON.stringify(diff, null, 2));
  process.exit(0);
}

console.error(JSON.stringify({ error: `Unknown command: ${command}` }));
process.exit(1);
