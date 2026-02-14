/**
 * fluxEngine.js
 * El motor central de Nous Flux (Chronos + Nexus)
 * Almacenamiento local-first basado en JSON (MVP robusto)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'fluxDb.json');

class FluxEngine {
    constructor() {
        this.data = this._loadData();
    }

    _loadData() {
        if (!fs.existsSync(DB_PATH)) {
            const initialData = { tasks: [], timeEntries: [], settings: {} };
            fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
            return initialData;
        }
        try {
            return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        } catch (e) {
            console.error('[FluxEngine] Error loading DB:', e);
            return { tasks: [], timeEntries: [], settings: {} };
        }
    }

    _saveData() {
        try {
            fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2));
            return true;
        } catch (e) {
            console.error('[FluxEngine] Error saving DB:', e);
            return false;
        }
    }

    // --- Nexus Tasks ---
    createTask(title, category = 'SEO', priority = 'medium') {
        const task = {
            id: crypto.randomUUID(),
            title,
            category,
            priority,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.data.tasks.push(task);
        this._saveData();
        return task;
    }

    updateTaskStatus(taskId, status) {
        const task = this.data.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = status;
            task.updatedAt = new Date().toISOString();
            this._saveData();
            return task;
        }
        return null;
    }

    getTasks() {
        return this.data.tasks;
    }

    // --- Chronos Engine (Time) ---
    startTimer(taskId, description) {
        // Stop any running timer first
        this.stopActiveTimer();

        const entry = {
            id: crypto.randomUUID(),
            taskId,
            description,
            startTime: new Date().toISOString(),
            endTime: null,
            duration: 0 // In seconds
        };
        this.data.timeEntries.push(entry);
        this._saveData();
        return entry;
    }

    stopActiveTimer() {
        const active = this.data.timeEntries.find(e => e.endTime === null);
        if (active) {
            active.endTime = new Date().toISOString();
            const start = new Date(active.startTime);
            const end = new Date(active.endTime);
            active.duration = Math.floor((end - start) / 1000);
            this._saveData();
            return active;
        }
        return null;
    }

    getActiveTimer() {
        return this.data.timeEntries.find(e => e.endTime === null);
    }

    getStats() {
        const totalSeconds = this.data.timeEntries.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        return {
            totalTasks: this.data.tasks.length,
            completedTasks: this.data.tasks.filter(t => t.status === 'DONE').length,
            totalTimeSeconds: totalSeconds,
            formattedTime: `${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}m`
        };
    }
}

module.exports = new FluxEngine();
