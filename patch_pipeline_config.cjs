const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/pipeline/PipelineBlockConfig.tsx', 'utf8');

const injection = `                                ))}
                            </div>
                            
                            {/* Reasoning Level Selector */}
                            <div className="mt-4 space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700 block">Nivel de Razonamiento</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-100"
                                    value={localBlock.additionalConfig?.reasoningLevel || 'none'}
                                    disabled={!(localBlock.model?.includes('3.6-flash') || localBlock.model?.includes('3.7-flash'))}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setLocalBlock({
                                            ...localBlock,
                                            additionalConfig: {
                                                ...(localBlock.additionalConfig || {}),
                                                reasoningLevel: val === 'none' ? undefined : val
                                            }
                                        });
                                    }}
                                >
                                    <option value="none">Por defecto (Desactivado)</option>
                                    <option value="low">Bajo (Low)</option>
                                    <option value="medium">Medio (Medium)</option>
                                    <option value="high">Alto (High)</option>
                                </select>
                                {!(localBlock.model?.includes('3.6-flash') || localBlock.model?.includes('3.7-flash')) && (
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        Solo disponible para modelos Gemini 3.6 Flash y Gemini 3.7 Flash.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Advanced (Chunks) */}`;

content = content.replace(/(\}\)\})\r?\n\s*<\/div>\r?\n\s*<\/div>\r?\n\r?\n\s*\{\/\*\s*Advanced\s*\(Chunks\)\s*\*\/\}/, injection);

fs.writeFileSync('src/components/dashboard/pipeline/PipelineBlockConfig.tsx', content, 'utf8');
console.log("Injected via robust regex");
