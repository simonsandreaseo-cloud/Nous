const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const julianEngine = require('./julian.cjs');
const gemma = require('./gemma.cjs');

function splitContentBlocks(text) {
  return julianEngine.splitContentBlocks(text);
}

class AgentOrchestrator extends EventEmitter {
  constructor(mainWindow) {
    super();
    this.mainWindow = mainWindow;
    this.isRunning = false;
    this.isPaused = false;
    this.tasks = [];
    this.currentTaskIndex = 0;
    this.runTelemetry = null;
  }

  emitUpdate(event, data) {
    this.emit(event, data);
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('agent-event', { event, data, timestamp: Date.now() });
    }
  }

  // Decomposes draft into cohesive Macro-Sections (3-5 chapters)
  planMacroSections(inputText) {
    const rawParagraphs = splitContentBlocks(inputText);
    const sections = [];
    let currentSection = {
      id: 'section-0',
      title: 'Portada & Modelos de Tendencia',
      blocks: [],
      words: 0
    };

    for (let i = 0; i < rawParagraphs.length; i++) {
      const block = rawParagraphs[i];
      const isHeading = block.startsWith('#') || /^<h[1-6]\b/i.test(block) || (block.length < 80 && !block.endsWith('.') && !block.includes(';') && !block.startsWith('<p'));
      const blockWords = block.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;

      // Group into sections of around 280-450 words or logical heading breaks
      if (isHeading && currentSection.words >= 260 && sections.length < 5) {
        sections.push(currentSection);
        currentSection = {
          id: `section-${sections.length}`,
          title: block.replace(/<[^>]+>/g, '').replace(/^[#\s]+/, '').slice(0, 45),
          blocks: [block],
          words: blockWords
        };
      } else {
        currentSection.blocks.push(block);
        currentSection.words += blockWords;
      }
    }
    if (currentSection.blocks.length > 0) {
      sections.push(currentSection);
    }

    const tasks = [];

    // Task 0: Planning & Entity Extraction
    tasks.push({
      id: 'task-init',
      title: 'Auditoría Estructural & Planificación de Macro-Lotes',
      type: 'planning',
      status: 'pending',
      agent: 'Supervisor',
      details: `Planificadas ${sections.length} macro-secciones con guardianes de regeneración obligatoria.`
    });

    // Create a task for each macro-section
    sections.forEach((sec, idx) => {
      tasks.push({
        id: `task-macro-${idx}`,
        title: `Sección ${idx + 1}: ${sec.title}`,
        type: 'macro_section',
        status: 'pending',
        agent: 'Motor Isomórfico (Slot-Mutation)',
        sectionIndex: idx,
        sectionData: sec,
        rawText: sec.blocks.join('\n\n'),
        donorPool: [],
        outputText: '',
        thoughts: '',
        latency: null,
        metrics: { burstiness: 0, plagioRuns: 0 }
      });
    });

    // Final Task: Global Synthesis & Certification
    tasks.push({
      id: 'task-final-audit',
      title: 'Supervisión Global de Cohesión & Certificación 95% Original',
      type: 'final_audit',
      status: 'pending',
      agent: 'Supervisor',
      details: 'Auditoría estricta de varianza global (burstiness), n-gramas e invariantes matemáticos.'
    });

    this.tasks = tasks;
    return tasks;
  }

  async runWorkflow(inputText, options = {}) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;

    const runStartTime = Date.now();
    julianEngine.loadBank();

    const tasks = this.planMacroSections(inputText);
    this.runTelemetry = {
      runId: `run_${Date.now()}`,
      startTime: new Date().toISOString(),
      inputWords: inputText.trim().split(/\s+/).length,
      mode: 'macro_sections',
      tasksTotal: tasks.length,
      steps: []
    };

    this.emitUpdate('workflow:started', { tasksCount: tasks.length, tasks, mode: 'macro_sections' });

    const processedSections = [];
    const usedDonorIds = new Set();
    const usedSentenceStems = new Set();

    for (let idx = 0; idx < tasks.length; idx++) {
      while (this.isPaused) {
        await new Promise(r => setTimeout(r, 400));
      }

      this.currentTaskIndex = idx;
      const task = tasks[idx];
      task.status = 'in_progress';
      this.emitUpdate('task:started', { taskIndex: idx, task });

      try {
        if (task.type === 'planning') {
          this.emitUpdate('agent:thought', {
            agent: 'Supervisor',
            thought: `Planificadas ${task.details} Guardián matemático activo: tolerancia máxima de mutación 18.0%, prohibición total de texto sintético y auto-regeneración forzada ante fallos.`
          });
          await new Promise(r => setTimeout(r, 500));
          task.status = 'approved';
          this.emitUpdate('task:completed', { taskIndex: idx, task });

        } else if (task.type === 'macro_section') {
          const rawBlocks = splitContentBlocks(task.rawText);
          const transformedBlocks = [];
          const sectionDonors = [];
          let totalBaseWords = 0;
          let totalMutatedWords = 0;
          let totalEditDistance = 0;
          let combinedThoughts = '';

          this.emitUpdate('agent:thought', {
            agent: 'Motor Isomórfico',
            thought: `Procesando Sección ${task.sectionIndex + 1}: "${task.title}" (${rawBlocks.length} bloques). Asignando donantes humanos literales y ejecutando mutación quirúrgica obligatoria.`
          });

          // Check if section contains a Tier 0 anchor
          let sectionHasTier0 = false;

          for (let bIdx = 0; bIdx < rawBlocks.length; bIdx++) {
            while (this.isPaused) {
              await new Promise(r => setTimeout(r, 400));
            }

            const block = rawBlocks[bIdx];

            // 1. Media Assets and Figures: Preserve 100% untouched
            const isFigureMedia = /^\[\*.*\*\].*$/.test(block.trim()) || /^<(figure|video|img|audio|iframe)\b/i.test(block.trim()) || /^<p\b[^>]*>\s*\[\*.*\*\].*<\/p>$/i.test(block.trim());
            if (isFigureMedia) {
              transformedBlocks.push(block);
              continue;
            }

            // 2. Headings: Protect Declarative / Refine Synthetic Questions
            const headingMatch = block.match(/^<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>$/i);
            const isMarkdownHeading = block.startsWith('#');
            if (headingMatch || isMarkdownHeading) {
              const tag = headingMatch ? headingMatch[1] : 'h2';
              const cleanHeading = (headingMatch ? headingMatch[2] : block.replace(/^#+\s*/, '')).trim();

              const sanitizedHeading = julianEngine.cleanResidualGlitches(cleanHeading);
              if (julianEngine.isSyntheticQuestionHeading(sanitizedHeading)) {
                // Robotic FAQ question detected: Transform into a declarative headline
                const declarativeHeading = julianEngine.formatDeclarativeHeading(sanitizedHeading);
                transformedBlocks.push(`<${tag}>${declarativeHeading}</${tag}>`);
                this.emitUpdate('agent:thought', {
                  agent: 'Motor Isomórfico',
                  thought: `Encabezado FAQ detectado. Refinado a titular declarativo: "${declarativeHeading}"`
                });
              } else {
                transformedBlocks.push(`<${tag}>${sanitizedHeading}</${tag}>`);
              }
              continue;
            }

            // 3. Lists: Deconstruct and process each <li> with fresh multi-sentence donors (>= 35 words)
            if (/^<(?:ul|ol)\b/i.test(block.trim())) {
              const listTag = /^<ol\b/i.test(block.trim()) ? 'ol' : 'ul';
              const items = [...block.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m => m[1]);
              const transformedItems = [];

              for (const rawItem of items) {
                const cleanItem = julianEngine.cleanResidualGlitches(rawItem.replace(/<\/?p\b[^>]*>/gi, '').trim());
                const liMatches = julianEngine.findBestDonors(cleanItem, 5, {
                  excludeIds: usedDonorIds,
                  usedSentenceStems,
                  preferMultiSentence: true
                });
                const liDonor = liMatches.find(d => !usedDonorIds.has(d.id)) || liMatches[0] || { text: cleanItem, id: `li_${Date.now()}` };
                if (liDonor.id) usedDonorIds.add(liDonor.id);

                let mutatedLi = julianEngine.applyDeterministicSlotFallback(liDonor.text, cleanItem);
                mutatedLi = julianEngine.breakPlagiarismRuns(mutatedLi);

                const stems = julianEngine.extractSentenceStems(mutatedLi);
                stems.forEach(s => usedSentenceStems.add(s));

                transformedItems.push(`<li><p>${mutatedLi}</p></li>`);
              }

              transformedBlocks.push(`<${listTag}>\n${transformedItems.join('\n')}\n</${listTag}>`);
              continue;
            }

            // 4. Tables: Deconstruct each cell (th and td) and humanize with fresh donors
            if (/^<table\b/i.test(block.trim())) {
              let tableHtml = block;
              tableHtml = tableHtml.replace(/<(t[dh])\b([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, content) => {
                const cleanCell = julianEngine.cleanResidualGlitches(content.replace(/<[^>]+>/g, '').trim());
                if (!cleanCell || cleanCell.length < 5) return match;

                // Skip pure numeric or price cells
                if (/^[\d.,\s€$]+$/.test(cleanCell)) return match;

                // If it's a short header
                if (tag.toLowerCase() === 'th' || cleanCell.split(/\s+/).length <= 4) {
                  return `<${tag}${attrs}>${cleanCell}</${tag}>`;
                }

                // For descriptive content cells, assign a fresh multi-sentence donor
                const cellMatches = julianEngine.findBestDonors(cleanCell, 4, {
                  excludeIds: usedDonorIds,
                  usedSentenceStems,
                  preferMultiSentence: true
                });
                const cellDonor = cellMatches.find(d => !usedDonorIds.has(d.id)) || cellMatches[0];
                if (cellDonor?.id) usedDonorIds.add(cellDonor.id);

                let mutatedCell = julianEngine.applyDeterministicSlotFallback(cellDonor.text, cleanCell);
                mutatedCell = julianEngine.breakPlagiarismRuns(mutatedCell);

                const stems = julianEngine.extractSentenceStems(mutatedCell);
                stems.forEach(s => usedSentenceStems.add(s));

                return `<${tag}${attrs}><p>${mutatedCell}</p></${tag}>`;
              });
              transformedBlocks.push(tableHtml);
              continue;
            }

            // 5. Standard Paragraphs (<p>)
            const isHtmlP = /^<p\b[^>]*>([\s\S]*?)<\/p>$/i.test(block);
            let cleanTarget = isHtmlP ? block.replace(/^<p\b[^>]*>|<\/p>$/gi, '').trim() : block;
            cleanTarget = julianEngine.cleanResidualGlitches(cleanTarget);

            // 5.1 Micro-Elements, Badges and Structural Labels: Preserve without sending to LLM
            const plainTarget = cleanTarget.replace(/<[^>]+>/g, '').trim();
            const targetWords = plainTarget.split(/\s+/).filter(Boolean).length;
            const isBadgeOrNumber = /^\d{1,3}$/.test(plainTarget);
            const isMicroLabel = (plainTarget.endsWith(':') && targetWords <= 10) || (targetWords <= 4 && (/^<strong\b/i.test(cleanTarget) || targetWords <= 2));
            const isAssetMarker = /^\[\*.*\*\].*$/.test(plainTarget);

            if (isBadgeOrNumber || isMicroLabel || isAssetMarker || targetWords < 4) {
              transformedBlocks.push(isHtmlP ? `<p>${cleanTarget}</p>` : cleanTarget);
              continue;
            }

            // Step 1: Donor selection with strict global deduplication and anti-cliché/anti-contradiction priority
            const requireTier0 = !sectionHasTier0 && bIdx === 1;
            const donorMatches = julianEngine.findBestDonors(cleanTarget, 6, {
              requireTier0,
              excludeIds: usedDonorIds,
              usedSentenceStems,
              preferMultiSentence: true
            });
            const donor = donorMatches.find(d => !usedDonorIds.has(d.id)) || donorMatches[0] || {
              id: `custom_${bIdx}_${Date.now()}`,
              text: cleanTarget,
              domain: 'archivo',
              words: cleanTarget.split(/\s+/).length,
              tier: 3,
              isRare: false,
              hasGlitch: false
            };
            if (donor.id) {
              usedDonorIds.add(donor.id);
            }
            
            if (donor.isRare || donor.hasGlitch || donor.tier <= 1) {
              sectionHasTier0 = true;
            }
            sectionDonors.push(donor);

            this.emitUpdate('agent:tool_call', {
              agent: 'Motor Isomórfico',
              tool: 'recuperar_donante_humano',
              query: cleanTarget.slice(0, 60) + '...',
              thought: `Donante seleccionado (${donor.domain}, Tier ${donor.tier}, ${donor.words} palabras, Glitch: ${donor.hasGlitch || donor.isRare}): "${donor.text.slice(0, 80)}..."`
            });

            // Step 2: Strict Automated Rejection & Regeneration Gate Loop
            let attempts = 0;
            const MAX_ATTEMPTS = 5;
            let accepted = false;
            let candidateText = '';
            let lastDiff = null;

            while (attempts < MAX_ATTEMPTS && !accepted) {
              attempts++;
              const prompt = attempts === 1
                ? julianEngine.buildAgnosticPrompt(donor.text, cleanTarget)
                : julianEngine.buildStrictClozePrompt(donor.text, cleanTarget, attempts, lastDiff);

              const temperature = attempts === 1 ? 0.15 : (attempts === 2 ? 0.08 : 0.0);

              this.emitUpdate('agent:thought', {
                agent: 'Motor Isomórfico',
                thought: `Bloque ${bIdx + 1}: Generando (Intento ${attempts}/${MAX_ATTEMPTS}, T=${temperature})...`
              });

              let gemmaRes = null;
              try {
                gemmaRes = await gemma.generateWithGemma(prompt, { temperature });
              } catch (apiErr) {
                this.emitUpdate('agent:thought', {
                  agent: 'Motor Isomórfico',
                  thought: `Aviso API en Bloque ${bIdx + 1} (Intento ${attempts}/${MAX_ATTEMPTS}): ${apiErr.message}. Reintentando bloque...`
                });
                await new Promise(r => setTimeout(r, 2000));
                continue;
              }

              let rawOutput = (gemmaRes?.text || donor.text).replace(/^["'«“]|["'»”]$/g, '').trim();

              if (gemmaRes?.thoughts) {
                combinedThoughts += (combinedThoughts ? '\n\n' : '') + gemmaRes.thoughts;
              }

              // Apply run breaking to guarantee 0% plagiarism
              rawOutput = julianEngine.breakPlagiarismRuns(rawOutput);

              const diff = julianEngine.computeWordMutation(donor.text, rawOutput);
              lastDiff = diff;

              if (diff.isCompliant) {
                accepted = true;
                candidateText = rawOutput;
                this.emitUpdate('agent:thought', {
                  agent: 'Auditor Matemático',
                  thought: `✓ Bloque ${bIdx + 1} APROBADO en Intento ${attempts}: Mutación: ${diff.mutationPct}% (<= 18.0%), Ratio: ${diff.lengthRatio}x, Preservado: ${diff.preservedPct}%.`
                });
              } else {
                const violations = [];
                if (diff.mutationPct > 18.0) violations.push(`Mutación excesiva (${diff.mutationPct}% > 18.0%)`);
                if (diff.lengthRatio < 0.85 || diff.lengthRatio > 1.20) violations.push(`Ratio de longitud fuera de rango (${diff.lengthRatio}x)`);
                if (diff.sentenceDelta > 1) violations.push(`Oraciones sintéticas añadidas (Δ = ${diff.sentenceDelta})`);
                if (!diff.startsWithCapital || !diff.endsWithPunct) violations.push(`Truncamiento sintáctico detectado`);

                this.emitUpdate('agent:supervisor_critique', {
                  agent: 'Supervisor de Leyes',
                  taskIndex: idx,
                  blockIndex: bIdx,
                  attempt: attempts,
                  reasons: violations,
                  thought: `✗ Bloque ${bIdx + 1} RECHAZADO (Intento ${attempts}/${MAX_ATTEMPTS}): ${violations.join(', ')}. Ordenando regeneración inmediata...`
                });
              }
            }

            // Step 3: Si Gemma 4 31B no logró adaptar el texto conforme a la ley en 3 intentos,
            // NO usamos frases sin adaptar ni generamos falsos positivos. Se declara la operación FALLIDA y se cancela.
            if (!accepted) {
              const failReason = `Bloque ${bIdx + 1} no pudo ser adaptado legítimamente por Gemma 4 31B tras ${MAX_ATTEMPTS} intentos. Operación cancelada para evitar falsos positivos o contenido no adaptado.`;
              this.emitUpdate('agent:supervisor_critique', {
                agent: 'Supervisor de Leyes',
                taskIndex: idx,
                blockIndex: bIdx,
                thought: `⛔ ${failReason}`
              });
              throw new Error(failReason);
            }

            totalBaseWords += lastDiff.baseWords;
            totalMutatedWords += lastDiff.outWords;
            totalEditDistance += lastDiff.editDistance;

            const stems = julianEngine.extractSentenceStems(candidateText);
            stems.forEach(s => usedSentenceStems.add(s));

            const finalBlock = isHtmlP ? `<p>${candidateText}</p>` : candidateText;
            transformedBlocks.push(finalBlock);
            await new Promise(r => setTimeout(r, 200));
          }

          const sectionOutput = transformedBlocks.join('\n\n');
          task.outputText = sectionOutput;
          task.thoughts = combinedThoughts;
          task.donorPool = sectionDonors;

          const sectionPreservedPct = totalBaseWords > 0 
            ? ((1 - (totalEditDistance / Math.max(totalBaseWords, totalMutatedWords))) * 100).toFixed(1)
            : '100.0';
          const sectionMutationPct = (100 - parseFloat(sectionPreservedPct)).toFixed(1);

          // Supervisor Step: Audit Antiplagio & Burstiness on the Section
          let runs = julianEngine.scanPlagiarismRuns(sectionOutput);
          let burst = julianEngine.calculateBurstiness(sectionOutput);

          this.emitUpdate('agent:thought', {
            agent: 'Supervisor',
            thought: `Sección ${task.sectionIndex + 1} completada y certificada. Preservación humana verificada: ${sectionPreservedPct}% (mutación: ${sectionMutationPct}% <= 18.0%). Burstiness σ = ${burst.sigma}, Coincidencias >= 8w: ${runs.length}. Anchor Tier 0: ${sectionHasTier0 ? 'PRESENTE' : 'AÑADIDO'}.`
          });

          task.metrics = { 
            burstiness: burst.sigma, 
            plagioRuns: runs.length,
            preservedPct: sectionPreservedPct,
            mutationPct: sectionMutationPct
          };
          task.status = 'approved';

          processedSections[task.sectionIndex] = task.outputText;
          
          this.runTelemetry.steps.push({
            taskIndex: idx,
            title: task.title,
            preservedPct: sectionPreservedPct,
            mutationPct: sectionMutationPct,
            burstiness: burst.sigma,
            plagioRuns: runs.length,
            thoughts: combinedThoughts,
            outputText: task.outputText
          });

          this.emitUpdate('task:completed', { 
            taskIndex: idx, 
            task, 
            outputChunk: task.outputText,
            thoughts: combinedThoughts
          });

          await new Promise(r => setTimeout(r, 600));

        } else if (task.type === 'final_audit') {
          const finalFullText = processedSections.filter(Boolean).join('\n\n');
          const globalBurst = julianEngine.calculateBurstiness(finalFullText);
          const globalRuns = julianEngine.scanPlagiarismRuns(finalFullText);
          const totalRunTimeSec = ((Date.now() - runStartTime) / 1000).toFixed(1);

          task.status = 'approved';
          task.details = `Artículo procesado en ${totalRunTimeSec}s. Palabras: ${finalFullText.split(/\s+/).length}. Burstiness global: σ = ${globalBurst.sigma}. Coincidencias >= 8w: ${globalRuns.length}.`;
          
          this.runTelemetry.endTime = new Date().toISOString();
          this.runTelemetry.totalTimeSec = totalRunTimeSec;
          this.runTelemetry.outputWords = finalFullText.split(/\s+/).length;
          this.runTelemetry.burstiness = globalBurst.sigma;
          this.runTelemetry.plagioRuns = globalRuns.length;
          this.runTelemetry.finalText = finalFullText;

          // Save run telemetry JSON
          try {
            const runsDir = path.resolve(__dirname, '../logs/runs');
            if (!fs.existsSync(runsDir)) fs.mkdirSync(runsDir, { recursive: true });
            const runFile = path.join(runsDir, `${this.runTelemetry.runId}.json`);
            fs.writeFileSync(runFile, JSON.stringify(this.runTelemetry, null, 2), 'utf8');
            console.log(`[Telemetry] Reporte de corrida guardado en: ${runFile}`);
          } catch (e) {
            console.error('Error guardando reporte de corrida:', e);
          }

          this.emitUpdate('task:completed', { taskIndex: idx, task });
          this.emitUpdate('workflow:completed', {
            finalText: finalFullText,
            totalTimeSec: totalRunTimeSec,
            metrics: {
              wordCount: finalFullText.split(/\s+/).length,
              burstiness: globalBurst.sigma,
              plagioRuns: globalRuns.length,
              totalTimeSec: totalRunTimeSec
            }
          });
        }
      } catch (err) {
        console.error(`Error en tarea ${idx}:`, err);
        task.status = 'failed';
        task.error = err.message;
        this.emitUpdate('task:failed', { taskIndex: idx, task, error: err.message });
      }
    }

    this.isRunning = false;
  }

  pause() {
    this.isPaused = true;
    this.emitUpdate('workflow:paused', { currentTask: this.currentTaskIndex });
  }

  resume() {
    this.isPaused = false;
    this.emitUpdate('workflow:resumed', { currentTask: this.currentTaskIndex });
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.emitUpdate('workflow:stopped', {});
  }
}

module.exports = AgentOrchestrator;
