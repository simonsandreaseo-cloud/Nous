import activeWin from 'active-win';
console.log('Imported successfully:', activeWin);
try {
    const result = await activeWin();
    console.log('Result:', result);
} catch (e) {
    console.error('Error running activeWin:', e);
}
