## 2024-05-19 - V8 Heap Allocation Benchmarking

**Title:** Benchmarking V8 Memory Allocations vs Execution Time
**Learning:** When trying to validate optimizations related to object churn and Garbage Collection (e.g., removing `new CANNON.Vec3` inside `useFrame`), raw execution time benchmarks using `performance.now()` can be deeply misleading. V8's "nursery" (young generation) allocator is extremely fast, often making code that allocates millions of short-lived objects execute just as fast—or even faster in synthetic microbenchmarks—than code that properly reuses objects. However, these short-lived allocations cause severe GC pauses (frame drops) in a real 60fps WebGL environment.
**Action:** Always measure heap usage differences (`v8.getHeapStatistics().used_heap_size`) and test with `--expose-gc` and `global.gc()` when benchmarking GC pressure optimizations, rather than relying solely on raw CPU time.
