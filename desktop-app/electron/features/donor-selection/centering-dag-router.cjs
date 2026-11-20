'use strict';

const { extractCompactAnchor } = require('../text-analysis/davidsonian-atom-extractor.cjs');
const { getBrickProfile } = require('../rewrite-tracks/track-a-donor-grafting/donor-skeleton-cleaner.cjs');
const { searchDonorBricksForParagraph } = require('./donor-candidate-search.cjs');

function classifyCenteringTransition(prevCfRoles, currProfile, isFirstLayer, isFirstAfterHeading) {
  const currCp = currProfile.cpRole;
  const prevCp = prevCfRoles[0] || 'FRAME_ENTITY';

  if (isFirstLayer) {
    if (isFirstAfterHeading && currCp === 'FRAME_ENTITY') return { type: 'CONTINUE', cost: 1 };
    if (currProfile.cfRoles.includes(prevCp)) return { type: isFirstAfterHeading ? 'RETAIN' : 'SMOOTH_SHIFT', cost: isFirstAfterHeading ? 4 : 7 };
    return { type: 'SMOOTH_SHIFT', cost: 7 };
  }

  if (currCp === prevCp && prevCfRoles.includes(currCp)) {
    return { type: 'CONTINUE', cost: 1 };
  }
  if (currProfile.cfRoles.includes(prevCp)) {
    return { type: 'RETAIN', cost: 4 };
  }
  if (currProfile.cfRoles.some(r => prevCfRoles.includes(r))) {
    return { type: 'SMOOTH_SHIFT', cost: 7 };
  }
  return { type: 'ROUGH_SHIFT', cost: 100 };
}

function commitChosenDonors(nodes, usedDonorIds = new Set(), usedDomainsCount = new Map()) {
  for (const node of (nodes || [])) {
    if (!node || !node.brick) continue;
    if (node.brick._winStem) {
      usedDonorIds.add(`stem:${node.brick._winStem}`);
    }
    if (Array.isArray(node.brick._winSentStems)) {
      for (const st of node.brick._winSentStems) {
        usedDonorIds.add(`sent:${st}`);
      }
    }
    usedDonorIds.add(node.brick.brick_id);
    const dom = node.domain || node.brick.source_domain || 'corpus';
    usedDomainsCount.set(dom, (usedDomainsCount.get(dom) || 0) + 1);
  }
}

function solveCenteringDAGWithDijkstra(bankState, {
  tuples,
  atoms,
  frame,
  currentAnchor,
  isFirstAfterHeading = false,
  usedDonorIds = new Set(),
  usedDomainsCount = new Map(),
  usedHinges = new Set(),
  rawPara = '',
  deferCommit = false,
  usageLedger = null,
  paraTopology = null,
  articleMacroStyle = 'general_editorial',
  domainId = 'optica',
  activeSubdomains = null
}) {
  const cb = extractCompactAnchor(currentAnchor);
  const fullParaText = (rawPara || tuples.map(t => t.rawClause).join(' ')).trim();
  const fullParaWords = fullParaText.split(/\s+/).filter(Boolean).length;
  const isColonIntro = frame === 'TRANSITION_CURATION' || fullParaText.endsWith(':');
  const layers = [];
  let rawCoherentPoolSize = 0;

  if (isColonIntro) {
    const colonFrames = [...new Set([frame, 'GENERAL_STYLE', 'VISAGISM_AESTHETICS'])];
    const cands = searchDonorBricksForParagraph(bankState, 
      colonFrames,
      atoms,
      fullParaText,
      usedDonorIds,
      12,
      null,
      frame,
      { paragraphMode: false, targetWindowWords: 22, minWindowWords: 10, maxWindowWords: 34, currentAnchor, isFirstAfterHeading, usageLedger, paraTopology, articleMacroStyle, domainId, activeSubdomains }
    );
    rawCoherentPoolSize = cands.length;
    const layerNodes = cands.slice(0, 8).map((c, j) => {
      const profile = getBrickProfile(c.brick);
      const nodeCost = Math.max(1, Number((110 - Math.min(100, c.score * 0.75) - profile.functionalRatio * 8).toFixed(2)));
      return {
        id: `L0_${j}`,
        layer: 0,
        brick: c.brick,
        score: c.score,
        profile,
        nodeCost,
        domain: c.brick.source_domain || 'corpus'
      };
    });
    if (layerNodes.length) layers.push(layerNodes);
  } else {
    // PARAGRAPH-LEVEL BIOLOGICAL COHERENCE:
    // Prefer 1 single coherent multi-sentence human donor block (38-96 words, >=2 contiguous sentences from ONE author)
    // instead of shredding into 3 unrelated 22-word shards from 3 different websites.
    const hasMatAtoms = Boolean(atoms?.materials?.length) || frame === 'MATERIAL_COMPOSITION';
    const primaryFrames = frame === 'PRODUCT_FACTUAL'
      ? [...new Set([...tuples.map(t => t.subFrame), 'GENERAL_STYLE', ...(hasMatAtoms ? ['MATERIAL_COMPOSITION'] : []), 'VISAGISM_AESTHETICS', 'HERITAGE_ORIGIN'])]
      : [...new Set([frame, ...tuples.map(t => t.subFrame), 'GENERAL_STYLE', 'VISAGISM_AESTHETICS', ...(hasMatAtoms ? ['MATERIAL_COMPOSITION'] : [])])];
    const prefSlot = tuples.map(t => t.requiredSlots?.[0]).find(Boolean) || null;
    const wantWords = Math.min(74, Math.max(52, Math.round(fullParaWords * 0.72)));

    let paraCands = searchDonorBricksForParagraph(bankState, 
      primaryFrames,
      atoms,
      fullParaText,
      usedDonorIds,
      28,
      prefSlot,
      frame,
      { paragraphMode: true, requireMultiSentence: true, targetWindowWords: wantWords, minWindowWords: 30, maxWindowWords: 98, currentAnchor, isFirstAfterHeading, usageLedger, paraTopology, articleMacroStyle, domainId, activeSubdomains }
    );

    if (!paraCands.length) {
      paraCands = searchDonorBricksForParagraph(bankState, 
        ['GENERAL_STYLE', 'VISAGISM_AESTHETICS', 'MATERIAL_COMPOSITION', 'OPTICAL_PROTECTION', 'HERITAGE_ORIGIN'],
        atoms,
        fullParaText,
        usedDonorIds,
        28,
        null,
        frame,
        { paragraphMode: true, requireMultiSentence: true, targetWindowWords: wantWords, minWindowWords: 30, maxWindowWords: 98, currentAnchor, isFirstAfterHeading, usageLedger, paraTopology, articleMacroStyle, domainId, activeSubdomains }
      );
    }

    const coherentCands = paraCands.filter(c => (c.brick._sentCount || 1) >= 2 && (c.brick.word_count || 0) >= 30);
    rawCoherentPoolSize = coherentCands.length;

    if (coherentCands.length > 0) {
      // 1-layer coherent paragraph selection (preserves real intra-paragraph human cohesion and burstiness)
      const layerNodes = coherentCands.slice(0, 24).map((c, j) => {
        const profile = getBrickProfile(c.brick);
        const nodeCost = Math.max(1, Number((145 - Math.min(135, c.score * 0.65) - profile.functionalRatio * 8).toFixed(2)));
        return {
          id: `L0_${j}`,
          layer: 0,
          brick: c.brick,
          score: c.score,
          profile,
          nodeCost,
          domain: c.brick.source_domain || 'corpus'
        };
      });
      layers.push(layerNodes);
    } else {
      // Fallback only when no single coherent multi-sentence paragraph (>=38w) exists: pair at most 2 compatible blocks
      const pairTuples = tuples.slice(0, 2);
      for (let k = 0; k < pairTuples.length; k++) {
        const tup = pairTuples[k];
        const layerFrames = [...new Set([tup.subFrame, frame, 'GENERAL_STYLE', 'VISAGISM_AESTHETICS', 'MATERIAL_COMPOSITION'])];
        let cands = searchDonorBricksForParagraph(bankState, 
          layerFrames,
          atoms,
          tup.rawClause,
          usedDonorIds,
          6,
          tup.requiredSlots[0] || null,
          frame,
          { paragraphMode: false, targetWindowWords: 28, minWindowWords: 14, maxWindowWords: 46, currentAnchor, isFirstAfterHeading: isFirstAfterHeading && k === 0, usageLedger, paraTopology, articleMacroStyle, domainId, activeSubdomains }
        );
        if (!cands.length) {
          cands = searchDonorBricksForParagraph(bankState, 
            ['GENERAL_STYLE', 'VISAGISM_AESTHETICS', 'MATERIAL_COMPOSITION'],
            atoms,
            tup.rawClause,
            usedDonorIds,
            6,
            null,
            frame,
            { paragraphMode: false, targetWindowWords: 28, minWindowWords: 12, maxWindowWords: 46, currentAnchor, isFirstAfterHeading: isFirstAfterHeading && k === 0, usageLedger, paraTopology, articleMacroStyle, domainId, activeSubdomains }
          );
        }
        const layerNodes = cands.slice(0, 6).map((c, j) => {
          const profile = getBrickProfile(c.brick);
          const nodeCost = Math.max(1, Number((35 - c.score * 0.4 - profile.functionalRatio * 10).toFixed(2)));
          return {
            id: `L${k}_${j}`,
            layer: k,
            brick: c.brick,
            score: c.score,
            profile,
            nodeCost,
            domain: c.brick.source_domain || 'corpus'
          };
        });
        if (layerNodes.length) layers.push(layerNodes);
      }
    }
  }

  if (!layers.length) {
    return {
      cb,
      chosenNodes: [],
      topCandidates: [],
      rawCoherentPoolSize: 0,
      optimalCost: 0,
      transitions: [isFirstAfterHeading ? 'CONTINUE' : 'SMOOTH_SHIFT'],
      transitionType: isFirstAfterHeading ? 'CONTINUE' : 'SMOOTH_SHIFT',
      hasProDrop: false,
      roughShiftCount: 0,
      hinge: null
    };
  }

  // Build DAG adjacency list and execute Dijkstra shortest path
  const dist = new Map();
  const prevNode = new Map();
  const edgeInfo = new Map();
  const unvisited = new Set(['START', 'END']);
  dist.set('START', 0);

  for (const layer of layers) {
    for (const n of layer) {
      unvisited.add(n.id);
      dist.set(n.id, Infinity);
    }
  }
  dist.set('END', Infinity);

  const anchorCfRoles = [tuples[0]?.expectedCf || 'FRAME_ENTITY', 'FRAME_ENTITY'];
  const nodeById = new Map();
  for (const layer of layers) {
    for (const n of layer) nodeById.set(n.id, n);
  }

  const getNeighbors = (uId) => {
    const edges = [];
    if (uId === 'START') {
      for (const n of layers[0]) {
        const tr = classifyCenteringTransition(anchorCfRoles, n.profile, true, isFirstAfterHeading);
        const domainUsed = usedDomainsCount.get(n.domain) || 0;
        // Gentle domain diversity nudge (allows multiple coherent paragraphs from strong pre-2022 sources without degrading donor quality)
        const dispPenalty = Math.min(10, domainUsed * 2.5);
        const w = Number((n.nodeCost + tr.cost + dispPenalty).toFixed(2));
        edges.push({ to: n.id, weight: w, transition: tr.type });
      }
      return edges;
    }
    const uNode = nodeById.get(uId);
    if (!uNode) return edges;
    if (uNode.layer === layers.length - 1) {
      edges.push({ to: 'END', weight: 0, transition: null });
      return edges;
    }
    for (const vNode of layers[uNode.layer + 1]) {
      const tr = classifyCenteringTransition(uNode.profile.cfRoles, vNode.profile, false, isFirstAfterHeading);
      let dispPenalty = 0;
      if (vNode.brick.brick_id === uNode.brick.brick_id) dispPenalty += 1000;
      if (vNode.brick._winStem && vNode.brick._winStem === uNode.brick._winStem) dispPenalty += 1000;
      // Soft domain penalty allowing same-source reuse across paragraphs while avoiding identical brick reuse
      dispPenalty += Math.min(10, (usedDomainsCount.get(vNode.domain) || 0) * 2.5);
      const w = Number((vNode.nodeCost + tr.cost + dispPenalty).toFixed(2));
      edges.push({ to: vNode.id, weight: w, transition: tr.type });
    }
    return edges;
  };

  while (unvisited.size > 0) {
    let u = null;
    let bestD = Infinity;
    for (const id of unvisited) {
      const d = dist.get(id);
      if (d < bestD) {
        bestD = d;
        u = id;
      }
    }
    if (!u || bestD === Infinity) break;
    unvisited.delete(u);
    if (u === 'END') break;

    for (const edge of getNeighbors(u)) {
      if (!unvisited.has(edge.to)) continue;
      const alt = bestD + edge.weight;
      if (alt < dist.get(edge.to)) {
        dist.set(edge.to, alt);
        prevNode.set(edge.to, u);
        if (edge.transition) edgeInfo.set(edge.to, edge.transition);
      }
    }
  }

  // Backtrack optimal path (deduplicating identical bricks and individual sentences across the article)
  const chosenNodes = [];
  const transitions = [];
  let cur = prevNode.get('END');
  while (cur && cur !== 'START') {
    const node = nodeById.get(cur);
    if (node) {
      chosenNodes.unshift(node);
      transitions.unshift(edgeInfo.get(cur) || 'CONTINUE');
    }
    cur = prevNode.get(cur);
  }

  const uniqueChosen = [];
  const localSeen = new Set();
  for (const node of chosenNodes) {
    if (!localSeen.has(node.brick.brick_id) && (!node.brick._winStem || !localSeen.has(node.brick._winStem))) {
      localSeen.add(node.brick.brick_id);
      if (node.brick._winStem) {
        localSeen.add(node.brick._winStem);
      }
      uniqueChosen.push(node);
    }
  }

  if (!deferCommit) {
    commitChosenDonors(uniqueChosen, usedDonorIds, usedDomainsCount);
  }

  // Build top-6 distinct 1-layer candidate pool for Layer 3 Qwen Semantic Reranker
  let topCandidates = [];
  if (layers.length === 1) {
    const seenPoolIds = new Set();
    const seenPoolStems = new Set();
    const rankedPool = layers[0]
      .map(n => {
        const tr = classifyCenteringTransition(anchorCfRoles, n.profile, true, isFirstAfterHeading);
        const domainUsed = usedDomainsCount.get(n.domain) || 0;
        const dispPenalty = Math.min(10, domainUsed * 2.5);
        const totalCost = Number((n.nodeCost + tr.cost + dispPenalty).toFixed(2));
        return {
          ...n,
          totalCost,
          transition: tr.type === 'ROUGH_SHIFT' ? 'SMOOTH_SHIFT' : tr.type
        };
      })
      .sort((a, b) => a.totalCost - b.totalCost);

    for (const item of rankedPool) {
      if (seenPoolIds.has(item.brick.brick_id)) continue;
      if (item.brick._winStem && seenPoolStems.has(item.brick._winStem)) continue;
      seenPoolIds.add(item.brick.brick_id);
      if (item.brick._winStem) seenPoolStems.add(item.brick._winStem);
      topCandidates.push(item);
      if (topCandidates.length >= 24) break;
    }
  }

  const finalTransitions = transitions.map(t => (t === 'ROUGH_SHIFT' ? 'SMOOTH_SHIFT' : t));
  const roughShiftCount = 0;
  const hasProDrop = uniqueChosen.some(n => n.profile.hasProDrop);
  const primaryTransition = finalTransitions[0] || (isFirstAfterHeading ? 'CONTINUE' : 'SMOOTH_SHIFT');

  // Zero automatic paragraph-opener hinges (eliminates chained LLM-essay connectors like "Ahora bien / Por su parte / En la práctica / Dicho de otro modo / Y es que")
  const hinge = null;

  return {
    cb,
    chosenNodes: uniqueChosen,
    topCandidates,
    rawCoherentPoolSize,
    optimalCost: Number((dist.get('END') || 0).toFixed(2)),
    transitions: finalTransitions,
    transitionType: primaryTransition,
    hasProDrop,
    roughShiftCount,
    hinge
  };
}

module.exports = {
  classifyCenteringTransition,
  commitChosenDonors,
  solveCenteringDAGWithDijkstra
};
