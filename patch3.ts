import { Project, SyntaxKind, ArrowFunction, CallExpression } from 'ts-morph';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('src/components/contents/writer/useWriterActions.ts');

const enqueueCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter(call => call.getExpression().getText() === 'enqueueTask');

for (const call of enqueueCalls) {
    const args = call.getArguments();
    if (args.length >= 3 && args[2].getKind() === SyntaxKind.ArrowFunction) {
        const arrowFunc = args[2] as ArrowFunction;
        
        // Wrap state mutations
        const mutations = arrowFunc.getDescendantsOfKind(SyntaxKind.CallExpression).filter(expr => {
            const propAccess = expr.getExpressionIfKind(SyntaxKind.PropertyAccessExpression);
            if (propAccess) {
                const text = propAccess.getText();
                return text.startsWith('store.set') || 
                       text.startsWith('store.add') || 
                       text.startsWith('store.remove') ||
                       text === 'useWriterStore.setState';
            }
            return false;
        });
        
        for (const mut of mutations) {
            const statement = mut.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
            if (statement && !statement.getText().startsWith('if')) {
                statement.replaceWithText(`if (useWriterStore.getState().draftId === targetTaskId) { ${statement.getText()} }`);
            }
        }
        
        // Find saveTaskVersion
        const saveCalls = arrowFunc.getDescendantsOfKind(SyntaxKind.CallExpression).filter(expr => {
            const propAccess = expr.getExpressionIfKind(SyntaxKind.PropertyAccessExpression);
            return propAccess && propAccess.getText() === 'store.saveTaskVersion';
        });
        
        for (const save of saveCalls) {
            const saveArgs = save.getArguments();
            if (saveArgs.length === 1) {
                save.addArgument('undefined');
                save.addArgument('targetTaskId');
            } else if (saveArgs.length === 2) {
                save.addArgument('targetTaskId');
            }
        }

        // Wrap the enqueueTask in a block
        const statement = call.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
        if (statement && statement.getParent()?.getKind() === SyntaxKind.Block) {
            const statementText = statement.getText();
            const newText = statementText.replace('});', '}, { taskId: targetTaskId, projectId: targetProjectId });');
            statement.replaceWithText(`{\n    const targetTaskId = store.draftId;\n    const targetProjectId = activeProject?.id;\n    ${newText}\n}`);
        }
    }
}

sourceFile.saveSync();
console.log('AST manipulation complete Part 3');
