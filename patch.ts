import { Project, SyntaxKind, ArrowFunction, CallExpression } from 'ts-morph';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('src/components/contents/writer/useWriterActions.ts');

const enqueueCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter(call => call.getExpression().getText() === 'enqueueTask');

for (const call of enqueueCalls) {
    const args = call.getArguments();
    if (args.length >= 3 && args[2].getKind() === SyntaxKind.ArrowFunction) {
        const arrowFunc = args[2] as ArrowFunction;
        const block = arrowFunc.getBody();
        
        if (block.getKind() === SyntaxKind.Block) {
            // First we need to wrap the whole enqueueTask call in a block so we can declare targetTaskId safely.
            const statement = call.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
            if (statement && statement.getParent()?.getKind() === SyntaxKind.Block) {
                // If it's already an expression statement in a block, replace it with a block containing the target variable.
                const statementText = statement.getText();
                statement.replaceWithText({
    const targetTaskId = store.draftId;
    const targetProjectId = activeProject?.id;
    );', '}, { taskId: targetTaskId, projectId: targetProjectId });')}
});
            }
        }
    }
}

sourceFile.saveSync();
console.log('AST manipulation complete');
