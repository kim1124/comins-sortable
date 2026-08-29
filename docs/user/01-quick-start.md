# Quick Start

Install the package and the peer dependency required by your adapter.

```sh
# Vanilla JavaScript
npm install comins-sortable

# React
npm install comins-sortable react react-dom

# Vue
npm install comins-sortable vue

# Svelte
npm install comins-sortable svelte
```

Import from the adapter-specific public export. Import the stylesheet when you
use the built-in placeholder preset.

```ts
import { SortableArea, SortableRoot } from 'comins-sortable/react';
import 'comins-sortable/styles.css';
```

Framework adapters are controlled. Your application owns each `items` array,
and `onItemsChange` (or Vue's `update:modelValue`) must render the proposed
array. Comins Sortable verifies that render on the next frame. A missing or
structurally stale render rolls back with `state-not-committed`.

Every item needs a stable, group-wide ID. Do not derive `itemKey` from an array
index.

Run the repository Playground:

```sh
git clone https://github.com/kim1124/comins-sortable.git
cd comins-sortable
npm ci --ignore-scripts
npm run dev
```

Open <http://127.0.0.1:4003/examples/simple/react>, then use **View code** to
inspect the selected adapter.

Continue with [Core Concepts](./02-core-concepts.md) or select an adapter from
the [documentation index](../README.md).
