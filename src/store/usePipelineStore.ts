import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PipelineActionType = 
    | 'research' 
    | 'outline' 
    | 'generate' 
    | 'refine' 
    | 'humanize' 
    | 'surgical_edit' 
    | 'clean' 
    | 'image' 
    | 'translation' 
    | 'seo';

export type AIModelType = 
    | 'gemma-4-31b' 
    | 'gemma-4-26b-moe' 
    | 'gemini-3.5-flash' 
    | 'gemini-3.1-flash-lite' 
    | 'default';

export interface PipelineBlock {
    id: string; 
    actionType: PipelineActionType;
    model: AIModelType;
    inputStatus: string; 
    outputStatus: string; 
    chunkSize: number; 
    additionalConfig?: Record<string, any>; 
}

export interface PipelineWorkflow {
    id: string;
    name: string;
    blocks: PipelineBlock[];
}

export type ExecutionMode = 'manual' | 'status' | 'auto';
export type ExecutionStrategy = 'by-type' | 'by-content';

interface PipelineState {
    workflows: Record<string, PipelineWorkflow>;
    activeWorkflowId: string;
    executionMode: ExecutionMode;
    executionStrategy: ExecutionStrategy;

    // Setters
    setExecutionMode: (mode: ExecutionMode) => void;
    setExecutionStrategy: (strategy: ExecutionStrategy) => void;
    setActiveWorkflow: (id: string) => void;
    updateWorkflowName: (id: string, name: string) => void;
    
    // Workflow management
    createWorkflow: () => string;
    deleteWorkflow: (id: string) => void;

    // Block management
    addBlock: (workflowId: string, block: Omit<PipelineBlock, 'id'>) => void;
    updateBlock: (workflowId: string, blockId: string, updates: Partial<PipelineBlock>) => void;
    removeBlock: (workflowId: string, blockId: string) => void;
    reorderBlocks: (workflowId: string, startIndex: number, endIndex: number) => void;
}

const DEFAULT_WORKFLOW_ID = 'default-workflow';

export const usePipelineStore = create<PipelineState>()(
    persist(
        (set, get) => ({
            workflows: {
                [DEFAULT_WORKFLOW_ID]: {
                    id: DEFAULT_WORKFLOW_ID,
                    name: 'Nuevo WorkFlow',
                    blocks: []
                }
            },
            activeWorkflowId: DEFAULT_WORKFLOW_ID,
            executionMode: 'manual',
            executionStrategy: 'by-type',

            setExecutionMode: (mode) => set({ executionMode: mode }),
            setExecutionStrategy: (strategy) => set({ executionStrategy: strategy }),
            
            setActiveWorkflow: (id) => set({ activeWorkflowId: id }),

            updateWorkflowName: (id, name) => set((state) => ({
                workflows: {
                    ...state.workflows,
                    [id]: {
                        ...state.workflows[id],
                        name
                    }
                }
            })),

            createWorkflow: () => {
                const id = crypto.randomUUID();
                set((state) => ({
                    workflows: {
                        ...state.workflows,
                        [id]: {
                            id,
                            name: 'Nuevo WorkFlow',
                            blocks: []
                        }
                    },
                    activeWorkflowId: id
                }));
                return id;
            },

            deleteWorkflow: (id) => set((state) => {
                const newWorkflows = { ...state.workflows };
                delete newWorkflows[id];
                
                // Ensure there is always at least one workflow
                if (Object.keys(newWorkflows).length === 0) {
                    const fallbackId = crypto.randomUUID();
                    newWorkflows[fallbackId] = { id: fallbackId, name: 'Nuevo WorkFlow', blocks: [] };
                    return { workflows: newWorkflows, activeWorkflowId: fallbackId };
                }
                
                return { 
                    workflows: newWorkflows,
                    activeWorkflowId: state.activeWorkflowId === id ? Object.keys(newWorkflows)[0] : state.activeWorkflowId
                };
            }),

            addBlock: (workflowId, blockInfo) => set((state) => {
                const workflow = state.workflows[workflowId];
                if (!workflow) return state;

                const newBlock: PipelineBlock = {
                    ...blockInfo,
                    id: crypto.randomUUID()
                };

                return {
                    workflows: {
                        ...state.workflows,
                        [workflowId]: {
                            ...workflow,
                            blocks: [...workflow.blocks, newBlock]
                        }
                    }
                };
            }),

            updateBlock: (workflowId, blockId, updates) => set((state) => {
                const workflow = state.workflows[workflowId];
                if (!workflow) return state;

                return {
                    workflows: {
                        ...state.workflows,
                        [workflowId]: {
                            ...workflow,
                            blocks: workflow.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b)
                        }
                    }
                };
            }),

            removeBlock: (workflowId, blockId) => set((state) => {
                const workflow = state.workflows[workflowId];
                if (!workflow) return state;

                return {
                    workflows: {
                        ...state.workflows,
                        [workflowId]: {
                            ...workflow,
                            blocks: workflow.blocks.filter(b => b.id !== blockId)
                        }
                    }
                };
            }),

            reorderBlocks: (workflowId, startIndex, endIndex) => set((state) => {
                const workflow = state.workflows[workflowId];
                if (!workflow) return state;

                const newBlocks = Array.from(workflow.blocks);
                const [removed] = newBlocks.splice(startIndex, 1);
                newBlocks.splice(endIndex, 0, removed);

                return {
                    workflows: {
                        ...state.workflows,
                        [workflowId]: {
                            ...workflow,
                            blocks: newBlocks
                        }
                    }
                };
            })
        }),
        {
            name: 'nous-pipeline-storage',
            version: 1,
        }
    )
);
