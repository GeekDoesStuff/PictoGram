// Runs the (slow for big grids) uniqueness repair off the main page thread.
import { makeUniquelySolvable } from './puzzle-repair.js';

self.onmessage = (e) => {
    const { jobId, grid, confidence } = e.data;
    const result = makeUniquelySolvable(grid, confidence);
    self.postMessage({ jobId, result });
};
