import { handleSEOTask } from './handlers/seo';
import { handleOutlineTask } from './handlers/outline';
import { handleGenerateTask } from './handlers/generate';
import { handleBatchResearch, handleBatchOutline, handleBatchGenerate, handleBatchHumanize, handleBatchTranslate } from './handlers/batch';

export type QueuePayload = Record<string, any>;

type QueueHandler = (taskId: string, payload: QueuePayload) => Promise<void>;

class Registry {
    private handlers: Record<string, QueueHandler> = {};

    register(type: string, handler: QueueHandler) {
        this.handlers[type] = handler;
    }

    get(type: string): QueueHandler | undefined {
        return this.handlers[type];
    }

    has(type: string): boolean {
        return !!this.handlers[type];
    }
}

export const QueueRegistry = new Registry();

QueueRegistry.register('seo', handleSEOTask);
QueueRegistry.register('outline', handleOutlineTask);
QueueRegistry.register('generate', handleGenerateTask);
QueueRegistry.register('batch_research', handleBatchResearch);
QueueRegistry.register('batch_outline', handleBatchOutline);
QueueRegistry.register('batch_generate', handleBatchGenerate);
QueueRegistry.register('batch_humanize', handleBatchHumanize);
QueueRegistry.register('batch_translate', handleBatchTranslate);
