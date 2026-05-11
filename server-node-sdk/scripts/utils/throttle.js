'use strict';

// ─── Throttle Utilities for Fabric CA Protection ─────────────────────────────
// Prevents connection resets and CA instability during bulk enrollment.

/**
 * Simple async sleep.
 * @param {number} ms – Milliseconds to wait
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute an async function for each item with per-item throttle delay.
 * @param {Array} items
 * @param {Function} fn – async (item, index) => result
 * @param {number} delayMs – Delay between each execution
 * @returns {Array} Results from each fn call
 */
const throttledForEach = async (items, fn, delayMs = 350) => {
    const results = [];
    for (let i = 0; i < items.length; i++) {
        const result = await fn(items[i], i);
        results.push(result);
        if (i < items.length - 1) {
            await sleep(delayMs);
        }
    }
    return results;
};

/**
 * Batch-and-Pause execution strategy.
 * Processes items in batches with per-item throttle AND inter-batch pauses.
 *
 * @param {Array} items
 * @param {Function} fn – async (item, index) => result
 * @param {Object} opts
 * @param {number} opts.batchSize – Items per batch (default: 10)
 * @param {number} opts.itemDelayMs – Delay between items within a batch (default: 350)
 * @param {number} opts.batchPauseMs – Pause between batches (default: 2000)
 * @param {Function} [opts.onBatchComplete] – Callback after each batch (batchIndex, totalBatches)
 * @returns {Array} Results
 */
const batchAndPause = async (items, fn, opts = {}) => {
    const {
        batchSize = 10,
        itemDelayMs = 350,
        batchPauseMs = 2000,
        onBatchComplete,
    } = opts;

    const results = [];
    const totalBatches = Math.ceil(items.length / batchSize);

    for (let b = 0; b < totalBatches; b++) {
        const start = b * batchSize;
        const end = Math.min(start + batchSize, items.length);
        const batch = items.slice(start, end);

        for (let i = 0; i < batch.length; i++) {
            const globalIndex = start + i;
            const result = await fn(batch[i], globalIndex);
            results.push(result);
            if (i < batch.length - 1) {
                await sleep(itemDelayMs);
            }
        }

        if (onBatchComplete) {
            onBatchComplete(b + 1, totalBatches);
        }

        // Pause between batches (skip after last batch)
        if (b < totalBatches - 1) {
            await sleep(batchPauseMs);
        }
    }

    return results;
};

module.exports = { sleep, throttledForEach, batchAndPause };
