const root = document.querySelector<HTMLElement>('#root');

if (root === null) {
  throw new Error('Missing Playground root');
}

root.innerHTML = '<main><h1>Comins Sortable Playground</h1></main>';
