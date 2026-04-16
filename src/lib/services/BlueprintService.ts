import { Editor } from '@tiptap/core';
import { LayoutRole, ImageAsset } from '@/types/images';

export interface BlueprintSlot {
    role: LayoutRole;
    positionType: 'fixed' | 'interval';
    interval?: number; // For 'interval', insert every N paragraphs
}

export interface Blueprint {
    id: string;
    name: string;
    slots: BlueprintSlot[];
}

const BLUEPRINTS: Record<string, Blueprint> = {
    basic_blog: {
        id: 'basic_blog',
        name: 'Blog Estándar',
        slots: [
            { role: 'hero', positionType: 'fixed' },
            { role: 'feature', positionType: 'interval', interval: 3 },
        ],
    },
    listicle: {
        id: 'listicle',
        name: 'Listicle / Top 10',
        slots: [
            { role: 'hero', positionType: 'fixed' },
            { role: 'feature', positionType: 'interval', interval: 2 },
        ],
    },
};

export class BlueprintService {
    /**
     * Applies a specific design blueprint to the editor, inserting imageSlot nodes.
     */
    static async applyBlueprint(editor: Editor, blueprintId: string) {
        const blueprint = BLUEPRINTS[blueprintId];
        if (!blueprint) throw new Error(`Blueprint ${blueprintId} not found`);

        const text = editor.getText();
        const paragraphs = text.split(/\n+/).filter(p => p.trim() !== "");
        
        const insertions: { pos: number, role: LayoutRole }[] = [];

        blueprint.slots.forEach(slot => {
            if (slot.positionType === 'fixed') {
                insertions.push({ pos: 0, role: slot.role });
            } else if (slot.positionType === 'interval' && slot.interval) {
                for (let i = 0; i < paragraphs.length; i += slot.interval) {
                    const estimatedPos = text.indexOf(paragraphs[i]) + paragraphs[i].length;
                    if (estimatedPos !== -1) {
                        insertions.push({ pos: estimatedPos, role: slot.role });
                    }
                }
            }
        });

        // Sort descending to avoid position shifts
        insertions.sort((a, b) => b.pos - a.pos);

        editor.chain();
        insertions.forEach(ins => {
            editor.chain().insertContentAt(ins.pos, {
                type: 'imageSlot',
                attrs: {
                    id: `slot-${Math.random().toString(36).substr(2, 9)}`,
                    role: ins.role,
                    status: 'pending',
                    prompt: '',
                    align: 'center',
                    wrapping: 'break',
                    width: '100%'
                }
            });
        });
        editor.chain().run();

        return {
            success: true,
            slotsInserted: insertions.length,
            blueprintName: blueprint.name
        };
    }

    static getAvailableBlueprints() {
        return Object.values(BLUEPRINTS);
    }
}
